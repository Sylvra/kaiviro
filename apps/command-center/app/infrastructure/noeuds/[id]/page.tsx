import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Sparkline } from "@/components/charts/Sparkline";
import { Icon } from "@/components/Icon";
import { Topbar } from "@/components/Topbar";
import { BoutonInactif, Chronologie, Exemple, ListeRelations, NoteExemple, Pastille, Point, Source } from "@/components/ui";
import { ETAT } from "@/lib/etats";
import { noeuds } from "@/lib/data/exemple";

export function generateStaticParams() {
  return noeuds.map((n) => ({ id: n.id }));
}

export const dynamicParams = false;

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const n = noeuds.find((x) => x.id === id);
  return { title: n?.nom ?? "Nœud" };
}

const ONGLETS = ["Aperçu", "Métriques", "Services", "Journaux", "Incidents", "Sauvegardes", "Actions", "Chronologie"];

export default async function FicheNoeud({ params }: Params) {
  const { id } = await params;
  const n = noeuds.find((x) => x.id === id);
  if (!n) notFound();

  return (
    <>
      <Topbar
        miettes={[{ label: "Infrastructure", href: "/infrastructure/carte" }, { label: "Servers & Nodes" }, { label: n.nom }]}
      />

      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-[18px] px-5 pb-10 pt-6 sm:px-8">
        <div className="fade-up flex flex-wrap items-start gap-4">
          <span className="grid size-[52px] place-items-center rounded-[14px] bg-primary text-on-primary">
            <Icon nom="server" taille={26} epaisseur={1.6} />
          </span>
          <div className="flex min-w-[260px] flex-1 flex-col gap-1.5">
            <span className="text-xs text-muted">{n.nature}</span>
            <h1 className="m-0 text-[26px] font-bold tracking-[-0.02em]">{n.nom}</h1>
            <span className="flex flex-wrap items-center gap-2">
              <Pastille etat={n.etat}>{n.libelleEtat}</Pastille>
              <Source p={n.provenance} suffixe="jamais mesuré" />
            </span>
          </div>
          <div className="flex gap-2">
            <BoutonInactif raison="Écriture indisponible : API d’administration non déployée">Modifier la fiche</BoutonInactif>
            <BoutonInactif primaire raison="Actions N2 : agent d’actions prévu en NX-3">
              Redémarrer un service
            </BoutonInactif>
          </div>
        </div>

        <div role="tablist" aria-label="Sections de la fiche" className="flex flex-wrap gap-1 border-b border-line">
          {ONGLETS.map((o, i) => (
            <span
              key={o}
              role="tab"
              aria-selected={i === 0}
              aria-disabled={i === 0 ? undefined : "true"}
              title={i === 0 ? undefined : "Onglet prévu en NX-2"}
              className={`-mb-px inline-flex h-[38px] items-center border-b-2 px-3 text-[13px] ${
                i === 0 ? "border-accent font-semibold text-ink" : "cursor-not-allowed border-transparent font-medium text-muted"
              }`}
            >
              {o}
              {o === "Services" && <span className="ml-1.5 text-[11px] text-muted">{n.services.length}</span>}
            </span>
          ))}
        </div>

        <NoteExemple>
          <b className="font-semibold">Données d’exemple.</b> La supervision n’est pas installée sur la Pi. Les métriques et
          états des services ci-dessous montrent l’affichage cible ; en production, chaque valeur absente reste « Inconnu ».
        </NoteExemple>

        <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-3">
          <div className="flex flex-col gap-[18px] xl:col-span-2">
            <section aria-labelledby="metriques" className="card flex flex-col gap-3.5 rounded-[14px] p-[18px]">
              <div className="flex items-baseline justify-between">
                <h2 id="metriques" className="m-0 text-base font-bold">
                  Métriques <Exemple />
                </h2>
                <div role="group" aria-label="Plage" className="inline-flex gap-0.5 rounded-lg border border-line p-0.5">
                  {["1 h", "24 h", "7 j"].map((p, i) => (
                    <span
                      key={p}
                      aria-pressed={i === 0}
                      aria-disabled={i === 0 ? undefined : "true"}
                      title={i === 0 ? undefined : "Historique long : NX-2"}
                      className={`inline-flex h-6 items-center rounded-md px-2 text-xs ${i === 0 ? "bg-primary text-on-primary" : "cursor-not-allowed text-faint"}`}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {n.series.map((s) => (
                  <Sparkline key={s.libelle} serie={s} />
                ))}
              </div>
            </section>

            <section aria-labelledby="services" className="card overflow-hidden rounded-[14px]">
              <div className="flex items-baseline justify-between px-[18px] pb-2 pt-4">
                <h2 id="services" className="m-0 text-base font-bold">
                  Services hébergés <Exemple />
                </h2>
                <span className="font-mono text-[11px] text-muted">S5 · systemd</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-[13px]">
                  <thead>
                    <tr className="text-left text-xs text-muted">
                      {["Service", "Rôle", "État", "Action autorisée"].map((h, i) => (
                        <th key={h} scope="col" className={`border-b border-line py-2 font-semibold ${i === 0 ? "pl-[18px]" : "px-2"}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {n.services.map((s) => (
                      <tr key={s.nom} className="row-link">
                        <td className="border-b border-grid py-2.5 pl-[18px] font-mono text-xs">{s.nom}</td>
                        <td className="border-b border-grid px-2 py-2.5 text-ink-2">{s.role}</td>
                        <td className="border-b border-grid px-2 py-2.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: ETAT[s.etat].ink }}>
                            <Point etat={s.etat} />
                            {s.libelleEtat}
                          </span>
                        </td>
                        <td className="border-b border-grid px-2 py-2.5 pr-[18px] text-xs text-ink-2">{s.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="flex flex-col gap-[18px]">
            <section aria-labelledby="apercu" className="card flex flex-col gap-3 rounded-[14px] p-[18px]">
              <h2 id="apercu" className="m-0 text-base font-bold">
                Aperçu
              </h2>
              <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-[9px] text-[13px]">
                {n.champs.map((c) => (
                  <div key={c.k} className="contents">
                    <dt className="text-muted">{c.k}</dt>
                    <dd className="m-0 font-medium">{c.v}</dd>
                  </div>
                ))}
              </dl>
              <span className="font-mono text-[11px] text-muted">Saisie NEXUS · modifiable en N2</span>
            </section>

            <section aria-labelledby="relations" className="card flex flex-col gap-2.5 rounded-[14px] p-[18px]">
              <h2 id="relations" className="m-0 text-base font-bold">
                Relations
              </h2>
              <ListeRelations relations={n.relations} />
            </section>

            <section aria-labelledby="chrono" className="card flex flex-col gap-2.5 rounded-[14px] p-[18px]">
              <h2 id="chrono" className="m-0 text-base font-bold">
                Chronologie
              </h2>
              <Chronologie evenements={n.chronologie} />
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
