import type { Metadata } from "next";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { BoutonInactif, Pastille, Source } from "@/components/ui";
import { chargerAdr, chargerDecisions, chargerTableau } from "@/lib/donnees";
import { jourParis } from "@/lib/s1/mapping";
import type { Decision } from "@/lib/s1/decisions";

export const metadata: Metadata = { title: "Project Management" };

const S1 = { source: "S1", libelle: "GitHub Issues · label decision", exemple: false };

function Statut({ d }: { d: Decision }) {
  return d.tranchee ? <Pastille etat="ok">Tranchée</Pastille> : <Pastille etat="attention">À trancher</Pastille>;
}

export default async function Projet({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const sp = await searchParams;
  const [{ plan, connecte }, decisions, adr] = await Promise.all([chargerTableau(), chargerDecisions(), chargerAdr()]);
  const liste = decisions.elements;
  const choisie = liste.find((d) => d.id === sp.d) ?? liste[0];
  const aTrancher = liste.filter((d) => !d.tranchee).length;
  const adrIds = new Set(adr.elements.map((a) => a.id));
  const fait = plan.termine.at(-1) ?? 0;

  return (
    <>
      <Topbar
        miettes={[{ label: "Workspace" }, { label: "Project Management" }]}
        actions={
          <BoutonInactif primaire raison="Création indisponible : API d’administration non déployée">
            Nouvelle décision
          </BoutonInactif>
        }
      />

      <div className="flex flex-wrap items-baseline gap-2.5 px-5 pb-2.5 pt-5 sm:px-9">
        <h1 className="m-0 mr-3 text-[22px] font-bold tracking-[-0.02em]">Project Management</h1>
        <span className="text-xs text-muted">Projet, jalons et décisions</span>
      </div>

      <div className="flex flex-col gap-4 px-5 pb-8 sm:px-9">
        <section aria-labelledby="projet-m0" className="card fade-up grid grid-cols-1 gap-5 rounded-[14px] p-[18px] md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted">Projet · KAIVIRO</span>
            <h2 id="projet-m0" className="m-0 text-[19px] font-bold">
              M0 · plan de {plan.duree} jours
            </h2>
            <p className="m-0 text-[13px] text-ink-2">
              J{plan.jourCourant} sur {plan.duree} · <b className="font-semibold text-ink">{fait}</b> tâches terminées sur {plan.total} ·{" "}
              {aTrancher} décision{aTrancher > 1 ? "s" : ""} à trancher
            </p>
            <span className="flex flex-wrap gap-3 text-xs">
              <Link href="/taches" className="link">
                Voir les tâches
              </Link>
              <Link href="/" className="link">
                Avancement détaillé
              </Link>
            </span>
            <Source p={plan.provenance} />
          </div>
          <ol aria-label="Jalons du plan" className="m-0 flex list-none flex-col gap-2 p-0">
            {plan.jalons.map((j) => {
              const fin = Number(j.fenetre.match(/(\d+)$/)?.[1] ?? 0);
              const courant = j.libelle === plan.jalon;
              return (
                <li
                  key={j.libelle}
                  className={`flex items-center gap-3 rounded-[10px] border px-3 py-2.5 text-[13px] ${courant ? "border-accent bg-accent-soft" : "border-line"}`}
                >
                  <span className="w-16 font-mono text-xs text-muted">{j.fenetre}</span>
                  <span className={`flex-1 ${courant ? "font-semibold" : ""}`}>{j.libelle}</span>
                  <span className="text-xs text-muted">{courant ? "jalon courant" : fin < plan.jourCourant ? "fenêtre passée" : "à venir"}</span>
                </li>
              );
            })}
            <li className="font-mono text-[11px] text-muted">
              Jalons saisis dans NEXUS d’après docs/roadmap/M0_PLAN.md{connecte ? "" : " · exemple"}
            </li>
          </ol>
        </section>

        <div className="flex flex-wrap items-start gap-4">
          <section aria-labelledby="decisions" className="card min-w-0 flex-[999_1_560px] overflow-x-auto rounded-[14px]">
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-3.5 pb-1 pt-4">
              <h2 id="decisions" className="m-0 text-[15px] font-semibold">
                Décisions{" "}
                <span className="text-xs font-normal text-muted">
                  {aTrancher} à trancher sur {liste.length}
                </span>
              </h2>
              <Source p={S1} />
            </div>
            {decisions.absence ? (
              <p className="m-0 px-3.5 py-6 text-[13px] text-muted">Décisions inconnues : {decisions.absence}.</p>
            ) : (
              <table className="w-full min-w-[640px] border-collapse text-[13px]">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    {["Décision", "Statut", "Porteur", "Référence"].map((h, i) => (
                      <th key={h} scope="col" className={`border-b border-line py-2.5 font-semibold ${i === 0 ? "pl-3.5" : "px-2"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {liste.map((d) => {
                    const sel = d.id === choisie?.id;
                    return (
                      <tr key={d.id} className={`row-link ${sel ? "bg-accent-soft" : ""}`} aria-current={sel ? "true" : undefined}>
                        <td className="border-b border-grid py-[11px] pl-3.5 font-semibold">
                          <Link href={`/projet?d=${d.id}`} scroll={false} className="hover:underline">
                            {d.titre}
                          </Link>
                        </td>
                        <td className="border-b border-grid px-2 py-[11px]">
                          <Statut d={d} />
                        </td>
                        <td className="whitespace-nowrap border-b border-grid px-2 py-[11px] text-xs text-ink-2">{d.porteur}</td>
                        <td className="border-b border-grid px-2 py-[11px] pr-3.5 font-mono text-xs text-ink-2">{d.reference ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          {choisie && (
            <aside
              aria-label="Aperçu de la décision sélectionnée"
              className="card flex w-full flex-col gap-4 rounded-[14px] p-[18px] lg:max-w-[400px] lg:flex-[1_1_340px]"
            >
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted">
                  Décision #{choisie.numero} · {choisie.porteur}
                </span>
                <h2 className="m-0 text-[17px] font-bold">{choisie.titre}</h2>
                <span className="self-start">
                  <Statut d={choisie} />
                </span>
              </div>
              {choisie.question && <p className="m-0 text-sm font-semibold">{choisie.question}</p>}
              {choisie.contexte && <p className="m-0 whitespace-pre-line text-[13px] text-ink-2">{choisie.contexte}</p>}
              <div className="flex flex-col gap-2">
                <h3 className="m-0 text-[13px] font-semibold">Options</h3>
                {choisie.options.length ? (
                  <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                    {choisie.options.map((o) => (
                      <li key={o} className="rounded-[10px] border border-line px-2.5 py-2 text-[13px]">
                        {o}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 text-[13px] text-muted">Aucune option listée dans l’issue.</p>
                )}
              </div>
              <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
                <dt className="text-muted">Ouverte le</dt>
                <dd className="m-0 font-mono text-xs">{jourParis(choisie.ouverteLe)}</dd>
                <dt className="text-muted">Tranchée le</dt>
                <dd className="m-0 font-mono text-xs">{choisie.trancheeLe ? jourParis(choisie.trancheeLe) : "—"}</dd>
                <dt className="text-muted">Référence</dt>
                <dd className="m-0 font-mono text-xs">
                  {choisie.reference && adrIds.has(choisie.reference) ? (
                    <Link href={`/connaissances?doc=${choisie.reference}`} className="link">
                      {choisie.reference}
                    </Link>
                  ) : (
                    (choisie.reference ?? "—")
                  )}
                </dd>
              </dl>
              <div className="flex flex-wrap gap-2">
                <BoutonInactif raison="Trancher depuis NEXUS : écriture N2, API d’administration non déployée">Trancher</BoutonInactif>
                <a href={choisie.lien} target="_blank" rel="noreferrer" className="btn">
                  Ouvrir sur GitHub
                </a>
              </div>
            </aside>
          )}
        </div>
      </div>
    </>
  );
}
