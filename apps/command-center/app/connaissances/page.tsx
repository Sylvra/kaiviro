import type { Metadata } from "next";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { Pastille, Source } from "@/components/ui";
import { chargerAdr, chargerDecisions } from "@/lib/donnees";
import { etatAdr } from "@/lib/s2/adr";

export const metadata: Metadata = { title: "Knowledge Center" };

const S2 = { source: "S2", libelle: "docs/adr sur develop", exemple: false };

export default async function Connaissances({ searchParams }: { searchParams: Promise<{ doc?: string }> }) {
  const sp = await searchParams;
  const [adr, decisions] = await Promise.all([chargerAdr(), chargerDecisions()]);
  const liste = adr.elements;
  const proposees = liste.filter((a) => a.statut === "PROPOSED").length;
  /** Décisions GitHub qui citent chaque ADR (label ref:). */
  const liees = (id: string) => decisions.elements.filter((d) => d.reference === id);

  return (
    <>
      <Topbar miettes={[{ label: "Intelligence & Administration" }, { label: "Knowledge Center" }]} />

      <div className="flex flex-wrap items-baseline gap-2.5 px-5 pb-2.5 pt-5 sm:px-9">
        <h1 className="m-0 mr-3 text-[22px] font-bold tracking-[-0.02em]">Knowledge Center</h1>
        <span className="text-xs text-muted">Décisions d’architecture (ADR) · lecture seule, modification par PR</span>
        <span className="flex-1" />
        <Source p={S2} />
      </div>

      <div className="flex flex-col gap-4 px-5 pb-8 sm:px-9">
        {!adr.absence && proposees > 0 && (
          <p role="note" className="m-0 rounded-xl bg-warn-bg px-3.5 py-3 text-[13px] text-warn-ink">
            <b className="font-semibold">
              {proposees} ADR sur {liste.length} en attente de validation humaine.
            </b>{" "}
            Tant qu’une ADR n’est pas acceptée, son contenu reste une proposition.
          </p>
        )}

        <section aria-label="Registre des ADR" className="card min-w-0 overflow-x-auto rounded-[14px]">
          {adr.absence ? (
            <p className="m-0 px-3.5 py-6 text-[13px] text-muted">Registre inconnu : {adr.absence}.</p>
          ) : (
            <table className="w-full min-w-[760px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-xs text-muted">
                  {["ADR", "Titre", "Statut", "Porteur", "Version", "Mise à jour", "Décisions liées"].map((h, i) => (
                    <th key={h} scope="col" className={`border-b border-line py-2.5 font-semibold ${i === 0 ? "pl-3.5" : "px-2"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {liste.map((a) => {
                  const e = etatAdr(a.statut);
                  const sel = a.id === sp.doc;
                  const d = liees(a.id);
                  return (
                    <tr key={a.id} id={a.id} className={`row-link ${sel ? "bg-accent-soft" : ""}`} aria-current={sel ? "true" : undefined}>
                      <td className="border-b border-grid py-[11px] pl-3.5 font-mono text-xs font-semibold">{a.id}</td>
                      <td className="border-b border-grid px-2 py-[11px] font-semibold">
                        <a href={a.lien} target="_blank" rel="noreferrer" className="hover:underline">
                          {a.titre}
                        </a>
                      </td>
                      <td className="border-b border-grid px-2 py-[11px]">
                        <Pastille etat={e.etat}>{e.libelle}</Pastille>
                      </td>
                      <td className="border-b border-grid px-2 py-[11px] text-xs text-ink-2">{a.porteur ?? "Inconnu"}</td>
                      <td className="border-b border-grid px-2 py-[11px] font-mono text-xs text-ink-2">{a.version ?? "—"}</td>
                      <td className="border-b border-grid px-2 py-[11px] font-mono text-xs text-ink-2">{a.majLe ?? "—"}</td>
                      <td className="border-b border-grid px-2 py-[11px] pr-3.5 text-xs">
                        {d.length === 0
                          ? "—"
                          : d.map((x, i) => (
                              <span key={x.id}>
                                {i > 0 && " · "}
                                <Link href={`/projet?d=${x.id}`} className="link">
                                  #{x.numero}
                                </Link>
                              </span>
                            ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <p className="m-0 px-3.5 py-2.5 text-xs text-muted">
            Seules les ADR présentes sur develop sont listées. Une ADR citée ailleurs mais absente du dépôt n’apparaît pas.
          </p>
        </section>
      </div>
    </>
  );
}
