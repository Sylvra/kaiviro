import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Topbar } from "@/components/Topbar";
import { BoutonInactif, Chronologie, ListeRelations, Pastille, Source } from "@/components/ui";
import { MISSION, STATUT, libelleEcheance } from "@/lib/etats";
import { chargerTableau } from "@/lib/donnees";
import type { StatutTache, Tache } from "@/lib/types";

export const metadata: Metadata = { title: "Tâches" };

type Vue = "table" | "kanban";
const VUES: { id: Vue | "roadmap"; label: string; phase?: string }[] = [
  { id: "table", label: "Table" },
  { id: "kanban", label: "Kanban" },
  { id: "roadmap", label: "Roadmap", phase: "NX-2" },
];
const COLONNES: StatutTache[] = ["todo", "doing", "review"];

function url(vue: Vue, t?: string) {
  const p = new URLSearchParams();
  if (vue !== "table") p.set("vue", vue);
  if (t) p.set("t", t);
  const s = p.toString();
  return s ? `/taches?${s}` : "/taches";
}

function Mission({ m }: { m: Tache["mission"] }) {
  const c = MISSION[m];
  return (
    <span className="whitespace-nowrap rounded-md px-[7px] py-0.5 text-xs font-semibold" style={{ background: c.bg, color: c.ink }}>
      {c.label}
    </span>
  );
}

function Echeance({ jours }: { jours: number }) {
  const e = libelleEcheance(jours);
  const couleur = e.ton === "retard" ? "var(--crit-ink)" : e.ton === "jour" ? "var(--warn-ink)" : "var(--ink-2)";
  return (
    <span className="whitespace-nowrap text-xs" style={{ color: couleur, fontWeight: e.ton === "retard" ? 600 : 400 }}>
      {e.texte}
    </span>
  );
}

function resumeRelations(t: Tache) {
  if (t.relations.length === 0) return "—";
  const parType = new Map<string, number>();
  for (const r of t.relations) parType.set(r.type, (parType.get(r.type) ?? 0) + 1);
  return [...parType].map(([type, n]) => `${n} ${type.toLowerCase()}${n > 1 ? "s" : ""}`).join(" · ");
}

export default async function Taches({ searchParams }: { searchParams: Promise<{ vue?: string; t?: string }> }) {
  const sp = await searchParams;
  const vue: Vue = sp.vue === "kanban" ? "kanban" : "table";
  const { taches, tachesOuvertes, tachesProvenance } = await chargerTableau();
  const choisie = taches.find((t) => t.id === sp.t) ?? taches.find((t) => t.id === "pi-vpn-conteneurs") ?? taches[0];

  return (
    <>
      <Topbar
        miettes={[{ label: "Workspace" }, { label: "Tasks & Roadmap" }]}
        actions={
          <BoutonInactif primaire raison="Création indisponible : API d’administration non déployée">
            <Icon nom="plus" taille={13} epaisseur={2.4} />
            Nouvelle tâche
          </BoutonInactif>
        }
      />

      <div className="flex flex-wrap items-center gap-2.5 px-5 pb-2.5 pt-5 sm:px-9">
        <h1 className="m-0 mr-3 text-[22px] font-bold tracking-[-0.02em]">Tâches</h1>
        <div role="tablist" aria-label="Affichage" className="inline-flex gap-0.5 rounded-[9px] border border-line bg-surface p-[3px]">
          {VUES.map((v) => {
            const actif = v.id === vue;
            const cls = "inline-flex h-7 items-center rounded-md px-2.5 text-xs";
            if (v.phase)
              return (
                <span key={v.id} role="tab" aria-disabled="true" aria-selected="false" title={`Prévu en ${v.phase}`} className={`${cls} cursor-not-allowed text-faint`}>
                  {v.label}
                </span>
              );
            return (
              <Link
                key={v.id}
                role="tab"
                aria-selected={actif}
                href={url(v.id as Vue, sp.t)}
                className={`${cls} ${actif ? "bg-primary font-semibold text-on-primary" : "font-medium text-ink-2 hover:text-ink"}`}
              >
                {v.label}
              </Link>
            );
          })}
        </div>
        <span className="flex-1" />
        {[
          ["Statut", "ouvert"],
          ["Projet", "M0"],
          ["Tri", "fenêtre"],
        ].map(([k, v]) => (
          <span key={k} className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-xs text-ink-2">
            {k} <b className="font-semibold text-ink">{v}</b>
          </span>
        ))}
        <Source p={tachesProvenance} />
      </div>

      <div className="flex flex-wrap items-start gap-4 px-5 pb-8 sm:px-9">
        {vue === "table" ? (
          <section aria-label="Liste des tâches" className="card min-w-0 flex-[999_1_560px] overflow-x-auto rounded-[14px]">
            <table className="w-full min-w-[720px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-xs text-muted">
                  {["Tâche", "Statut", "Mission", "Fenêtre", "Échéance", "Relations"].map((h, i) => (
                    <th key={h} scope="col" className={`border-b border-line py-2.5 font-semibold ${i === 0 ? "pl-3.5" : "px-2"} ${i === 3 ? "text-ink" : ""}`}>
                      {h}
                      {i === 3 && <span aria-label="tri croissant"> ↑</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {taches.map((t) => {
                  const sel = t.id === choisie?.id;
                  return (
                    <tr key={t.id} className={`row-link ${sel ? "bg-accent-soft" : ""}`} aria-current={sel ? "true" : undefined}>
                      <td className="border-b border-grid py-[11px] pl-3.5 font-semibold">
                        <Link href={url(vue, t.id)} scroll={false} className="hover:underline">
                          {t.titre}
                        </Link>
                      </td>
                      <td className="border-b border-grid px-2 py-[11px]">
                        <Pastille etat={t.statut} />
                      </td>
                      <td className="border-b border-grid px-2 py-[11px]">
                        <Mission m={t.mission} />
                      </td>
                      <td className="border-b border-grid px-2 py-[11px] font-mono text-xs text-ink-2">{t.fenetre}</td>
                      <td className="border-b border-grid px-2 py-[11px]">
                        <Echeance jours={t.echeanceJours} />
                      </td>
                      <td className="border-b border-grid px-2 py-[11px] pr-3.5 text-xs text-ink-2">{resumeRelations(t)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="m-0 px-3.5 py-2.5 text-xs text-muted">
              {taches.length} tâches affichées sur {tachesOuvertes} ouvertes · terminées masquées
            </p>
          </section>
        ) : (
          <section aria-label="Tâches par statut" className="grid min-w-0 flex-[999_1_560px] grid-cols-1 gap-3 md:grid-cols-3">
            {COLONNES.map((s) => {
              const liste = taches.filter((t) => t.statut === s);
              return (
                <div key={s} className="flex flex-col gap-2 rounded-[14px] bg-grid/70 p-2.5">
                  <h2 className="m-0 flex items-center justify-between px-1 text-[13px] font-semibold">
                    <Pastille etat={s} />
                    <span className="text-xs font-medium text-muted">{liste.length}</span>
                  </h2>
                  {liste.map((t) => (
                    <Link
                      key={t.id}
                      href={url(vue, t.id)}
                      scroll={false}
                      className={`card flex flex-col gap-2 rounded-xl p-3 transition-shadow hover:shadow-md ${t.id === choisie?.id ? "outline-2 outline-accent" : ""}`}
                    >
                      <span className="text-[13px] font-semibold">{t.titre}</span>
                      <span className="flex flex-wrap items-center gap-2">
                        <Mission m={t.mission} />
                        <span className="font-mono text-xs text-muted">{t.fenetre}</span>
                        <span className="ml-auto">
                          <Echeance jours={t.echeanceJours} />
                        </span>
                      </span>
                    </Link>
                  ))}
                  {liste.length === 0 && <p className="m-0 px-1 py-4 text-center text-xs text-muted">Aucune tâche.</p>}
                </div>
              );
            })}
          </section>
        )}

        {choisie && (
        <aside aria-label="Aperçu de la tâche sélectionnée" className="card flex w-full flex-col gap-4 rounded-[14px] p-[18px] lg:max-w-[380px] lg:flex-[1_1_320px]">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Tâche · {MISSION[choisie.mission].label}</span>
            <h2 className="m-0 text-[17px] font-bold">{choisie.titre}</h2>
            <span className="self-start">
              <Pastille etat={choisie.statut}>{STATUT[choisie.statut].label}</Pastille>
            </span>
          </div>
          <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-2.5 text-[13px]">
            <dt className="text-muted">Fenêtre</dt>
            <dd className="m-0 font-mono text-xs">{choisie.fenetre}</dd>
            <dt className="text-muted">Échéance</dt>
            <dd className="m-0">
              <Echeance jours={choisie.echeanceJours} />
            </dd>
            <dt className="text-muted">Chemin</dt>
            <dd className="m-0 font-mono text-xs">{choisie.chemin ?? "Inconnu"}</dd>
            <dt className="text-muted">Assignée</dt>
            <dd className="m-0">{choisie.assignees ?? "Inconnu"}</dd>
          </dl>
          <div className="flex flex-col gap-2">
            <h3 className="m-0 text-[13px] font-semibold">Relations</h3>
            <ListeRelations relations={choisie.relations} />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="m-0 text-[13px] font-semibold">Chronologie</h3>
            <Chronologie evenements={choisie.chronologie} />
          </div>
          <div className="flex gap-2">
            <BoutonInactif raison="Écriture indisponible : API d’administration non déployée">Marquer terminée</BoutonInactif>
            {choisie.lien && (
              <a href={choisie.lien} target="_blank" rel="noreferrer" className="btn">
                Ouvrir sur GitHub
              </a>
            )}
          </div>
        </aside>
        )}
      </div>
    </>
  );
}
