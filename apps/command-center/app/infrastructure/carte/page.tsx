import type { Metadata } from "next";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { Pastille, Point } from "@/components/ui";
import { ETAT } from "@/lib/etats";
import { carte } from "@/lib/data/exemple";
import { chargerPi, chargerTableau } from "@/lib/donnees";
import type { Etat } from "@/lib/types";

export const metadata: Metadata = { title: "Infrastructure Map" };

const LEGENDE: { etat: Etat; texte: string }[] = [
  { etat: "ok", texte: "mesuré et sain" },
  { etat: "attention", texte: "seuil approché" },
  { etat: "alerte", texte: "panne ou échec" },
  { etat: "inconnu", texte: "aucune mesure, jamais supposé sain" },
];

export default async function Carte({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const vue = (await searchParams).vue === "table" ? "table" : "carte";
  const { noeud: pi, mesure, cpu, temperature } = await chargerPi();
  const actifs = pi.services.filter((s) => s.etat === "ok").length;
  const { connecte, sante } = await chargerTableau();
  const gh = sante.find((x) => x.nom === "GitHub")!;
  // Seul GitHub est mesuré (S1) ; les autres nœuds gardent leur état saisi, jamais supposé sain.
  const noeudsCarte = carte.noeuds.map((n) => n.id === "github"
      ? { ...n, etat: gh.etat, libelleEtat: gh.libelle }
      : n.id === "front" && connecte
        ? { ...n, libelleEtat: "S1 branché · reste d’exemple" }
        : n,
  );

  return (
    <>
      <Topbar miettes={[{ label: "Infrastructure" }, { label: "Infrastructure Map" }]} />

      <div className="flex flex-wrap items-center gap-2.5 px-5 pb-2.5 pt-5 sm:px-9">
        <h1 className="m-0 mr-3 text-[22px] font-bold tracking-[-0.02em]">Infrastructure Map</h1>
        <div role="tablist" aria-label="Affichage" className="inline-flex gap-0.5 rounded-[9px] border border-line bg-surface p-[3px]">
          {(["carte", "table"] as const).map((v) => (
            <Link
              key={v}
              role="tab"
              aria-selected={v === vue}
              href={v === "carte" ? "/infrastructure/carte" : "/infrastructure/carte?vue=table"}
              className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs ${v === vue ? "bg-primary font-semibold text-on-primary" : "font-medium text-ink-2 hover:text-ink"}`}
            >
              {v === "carte" ? "Carte" : "Table"}
            </Link>
          ))}
        </div>
        <span className="flex-1" />
        <span className="text-xs text-muted">Topologie saisie dans NEXUS · {mesure && connecte ? "GitHub (S1) et Pi (S5) mesurés, le reste non branché" : mesure ? "Pi mesurée (S5), le reste d’exemple" : connecte ? "GitHub mesuré (S1), le reste non branché" : "états d’exemple"}</span>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 px-5 pb-8 sm:px-9 2xl:grid-cols-[minmax(0,1fr)_340px]">
        {vue === "carte" ? (
          <section aria-label="Carte topologique" className="card min-w-0 overflow-auto rounded-2xl">
            <div
              className="relative mx-auto h-[640px] w-[1000px]"
              style={{ backgroundImage: "radial-gradient(var(--grid) 1px, transparent 1px)", backgroundSize: "24px 24px" }}
            >
              <svg width="1000" height="640" viewBox="0 0 1000 640" aria-hidden="true" className="absolute inset-0">
                <g fill="none" strokeWidth="1.5">
                  {carte.liens.map((l) => (
                    <path
                      key={l.d}
                      d={l.d}
                      stroke={l.mesure ? "var(--accent)" : "var(--line-strong)"}
                      strokeOpacity={l.mesure ? 0.8 : 1}
                      strokeDasharray={l.mesure ? undefined : "4 4"}
                      pathLength={l.mesure ? 1 : undefined}
                      className={l.mesure ? "draw" : undefined}
                    />
                  ))}
                </g>
              </svg>

              {noeudsCarte.map((n, i) => (
                <div
                  key={n.id}
                  className="fade-up absolute flex w-[180px] flex-col gap-1 rounded-xl border bg-surface px-3.5 py-3 shadow-[0_10px_24px_-16px_rgb(0_0_0/0.5)]"
                  style={{
                    left: n.x,
                    top: n.y,
                    borderColor: n.candidat ? "var(--line-strong)" : "var(--line)",
                    borderStyle: n.candidat ? "dashed" : "solid",
                    animationDelay: `${i * 40}ms`,
                  }}
                >
                  <span className="flex items-center gap-2 text-[13px] font-semibold">
                    <Point etat={n.etat} taille={8} />
                    {n.nom}
                  </span>
                  <span className="text-xs text-muted">{n.nature}</span>
                  <span className="text-xs font-semibold" style={{ color: ETAT[n.etat].ink }}>
                    {n.libelleEtat}
                  </span>
                </div>
              ))}

              <Link
                href={`/infrastructure/noeuds/${pi.id}`}
                className="fade-up absolute flex w-[160px] flex-col gap-2 rounded-[14px] border border-accent bg-surface p-3.5 shadow-[0_0_0_4px_var(--accent-soft)] transition-transform hover:-translate-y-0.5"
                style={{ left: 820, top: 330, animationDelay: "300ms" }}
              >
                <span className="flex items-center gap-2 text-[13px] font-bold">
                  <Point etat={pi.etat} taille={8} />
                  {pi.nom}
                </span>
                <span className="text-xs text-muted">{mesure ? "Nœud · supervisé (S5)" : "Nœud · non supervisé"}</span>
                <span className="flex flex-col gap-1 font-mono text-[11px] text-ink-2">
                  {(mesure ? pi.services.map((s) => ({ nom: s.nom, etat: s.etat })) : carte.servicesPi.map((nom) => ({ nom, etat: "inconnu" as const }))).map((s) => (
                    <span key={s.nom} className="flex items-center gap-1.5">
                      <Point etat={s.etat} taille={6} />
                      {s.nom}
                    </span>
                  ))}
                </span>
              </Link>

              <span className="absolute left-[600px] top-[600px] flex gap-4 text-[11px] text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-[18px] border-t-[1.5px] border-accent" />
                  flux mesuré
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-[18px] border-t-[1.5px] border-dashed border-line-strong" />
                  prévu ou non mesuré
                </span>
              </span>
            </div>
          </section>
        ) : (
          <section aria-label="Nœuds et services" className="card min-w-0 overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[620px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-xs text-muted">
                  {["Élément", "Nature", "État", "Détail"].map((h, i) => (
                    <th key={h} scope="col" className={`border-b border-line py-2.5 font-semibold ${i === 0 ? "pl-4" : "px-2"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...noeudsCarte, { id: pi.id, nom: pi.nom, nature: "Nœud · Administration", etat: pi.etat, libelleEtat: pi.libelleEtat }].map((n) => (
                  <tr key={n.id} className="row-link">
                    <td className="border-b border-grid py-2.5 pl-4 font-semibold">
                      {n.id === pi.id ? (
                        <Link href={`/infrastructure/noeuds/${pi.id}`} className="link">
                          {n.nom}
                        </Link>
                      ) : (
                        n.nom
                      )}
                    </td>
                    <td className="border-b border-grid px-2 py-2.5 text-ink-2">{n.nature}</td>
                    <td className="border-b border-grid px-2 py-2.5">
                      <Pastille etat={n.etat} />
                    </td>
                    <td className="border-b border-grid px-2 py-2.5 text-xs text-ink-2">{n.libelleEtat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <aside aria-label="Détail du nœud sélectionné" className="grid grid-cols-1 items-start gap-3.5 md:grid-cols-2 2xl:grid-cols-1">
          <section className="card flex flex-col gap-3 rounded-[14px] p-4">
            <span className="text-xs text-muted">Sélection</span>
            <h2 className="m-0 text-[17px] font-bold">{pi.nom}</h2>
            <span className="self-start">
              <Pastille etat={pi.etat}>{mesure ? pi.libelleEtat : "Inconnu · aucune métrique"}</Pastille>
            </span>
            <dl className="m-0 grid grid-cols-2 gap-x-2.5 gap-y-2 text-[13px]">
              <dt className="text-muted">CPU</dt>
              <dd className={`m-0 ${cpu === null ? "text-faint" : ""}`}>{cpu === null ? "—" : `${cpu} %`}</dd>
              <dt className="text-muted">Température</dt>
              <dd className={`m-0 ${temperature === null ? "text-faint" : ""}`}>{temperature === null ? "—" : `${temperature} °C`}</dd>
              <dt className="text-muted">Services actifs</dt>
              <dd className={`m-0 ${mesure ? "" : "text-faint"}`}>{mesure ? `${actifs} sur ${pi.services.length}` : "—"}</dd>
              <dt className="text-muted">Accès</dt>
              <dd className="m-0">Tailscale</dd>
            </dl>
            <Link href={`/infrastructure/noeuds/${pi.id}`} className="btn btn-primary h-9 justify-center">
              Ouvrir la fiche
            </Link>
          </section>
          <section className="card flex flex-col gap-2.5 rounded-[14px] p-4">
            <h2 className="m-0 text-sm font-semibold">Légende des états</h2>
            {LEGENDE.map((g) => (
              <span key={g.etat} className="flex items-center gap-2 text-[13px] text-ink-2">
                <Point etat={g.etat} taille={8} />
                <b className="font-semibold text-ink">{ETAT[g.etat].label}</b> {g.texte}
              </span>
            ))}
          </section>
          <p className="m-0 text-xs text-muted md:col-span-2 2xl:col-span-1">
            Supabase et Vercel sont des candidats (ADR-0004, ADR-0014) : aucun compte créé, aucune métrique affichée.
          </p>
        </aside>
      </div>
    </>
  );
}
