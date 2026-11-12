import type { Metadata } from "next";
import { Topbar } from "@/components/Topbar";
import { Pastille } from "@/components/ui";
import { chargerSources } from "@/lib/donnees";

export const metadata: Metadata = { title: "Settings" };

export default async function Reglages() {
  const sources = await chargerSources();
  const branchees = sources.filter((s) => s.etat === "ok").length;

  return (
    <>
      <Topbar miettes={[{ label: "Intelligence & Administration" }, { label: "Settings" }]} />

      <div className="flex flex-wrap items-baseline gap-2.5 px-5 pb-2.5 pt-5 sm:px-9">
        <h1 className="m-0 mr-3 text-[22px] font-bold tracking-[-0.02em]">Settings</h1>
        <span className="text-xs text-muted">Sources de données · membres, rôles et vues partagées arrivent avec l’API d’administration</span>
      </div>

      <div className="flex flex-col gap-4 px-5 pb-8 sm:px-9">
        <section aria-labelledby="sources" className="card min-w-0 overflow-x-auto rounded-[14px]">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-3.5 pb-1 pt-4">
            <h2 id="sources" className="m-0 text-[15px] font-semibold">
              Sources{" "}
              <span className="text-xs font-normal text-muted">
                {branchees} branchée{branchees > 1 ? "s" : ""} sur {sources.length}
              </span>
            </h2>
            <span className="font-mono text-[11px] text-muted">Catalogue : CRM_SPEC §4 · état lu à l’affichage</span>
          </div>
          <table className="w-full min-w-[760px] border-collapse text-[13px]">
            <thead>
              <tr className="text-left text-xs text-muted">
                {["Source", "Nom", "Contenu", "État", "Pages alimentées"].map((h, i) => (
                  <th key={h} scope="col" className={`border-b border-line py-2.5 font-semibold ${i === 0 ? "pl-3.5" : "px-2"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} className="row-link">
                  <td className="border-b border-grid py-[11px] pl-3.5 font-mono text-xs font-semibold">{s.id}</td>
                  <td className="border-b border-grid px-2 py-[11px] font-semibold">{s.nom}</td>
                  <td className="border-b border-grid px-2 py-[11px] text-ink-2">{s.contenu}</td>
                  <td className="border-b border-grid px-2 py-[11px]">
                    <Pastille etat={s.etat}>{s.libelle}</Pastille>
                  </td>
                  <td className="border-b border-grid px-2 py-[11px] pr-3.5 text-xs text-ink-2">{s.pages ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="m-0 px-3.5 py-2.5 text-xs text-muted">
            Les jetons et adresses restent dans <code className="font-mono">.env.local</code>, côté serveur. Ils ne sont jamais affichés ici.
          </p>
        </section>
      </div>
    </>
  );
}
