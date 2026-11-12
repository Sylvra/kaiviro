import type { Metadata } from "next";
import { Topbar } from "@/components/Topbar";
import { Pastille } from "@/components/ui";
import { chargerCloud } from "@/lib/donnees";

export const metadata: Metadata = { title: "Cloud Services" };

export default async function Cloud() {
  const services = await chargerCloud();

  return (
    <>
      <Topbar miettes={[{ label: "Infrastructure" }, { label: "Cloud Services" }]} />

      <div className="flex flex-wrap items-baseline gap-2.5 px-5 pb-2.5 pt-5 sm:px-9">
        <h1 className="m-0 mr-3 text-[22px] font-bold tracking-[-0.02em]">Cloud Services</h1>
        <span className="text-xs text-muted">Services tiers utilisés ou candidats · aucun service payant</span>
      </div>

      <div className="grid grid-cols-1 gap-4 px-5 pb-8 sm:px-9 md:grid-cols-2">
        {services.map((s, i) => (
          <section
            key={s.id}
            aria-labelledby={`cloud-${s.id}`}
            className="card fade-up flex flex-col gap-3 rounded-[14px] p-[18px]"
            style={{ animationDelay: `${i * 40}ms`, borderStyle: s.candidat ? "dashed" : undefined }}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <h2 id={`cloud-${s.id}`} className="m-0 text-[17px] font-bold">
                  {s.nom}
                </h2>
                <span className="text-xs text-muted">{s.role}</span>
              </div>
              <Pastille etat={s.etat}>{s.libelle}</Pastille>
            </div>
            {s.champs.length > 0 && (
              <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
                {s.champs.map((c) => (
                  <div key={c.k} className="contents">
                    <dt className="text-muted">{c.k}</dt>
                    <dd className="m-0 font-medium">{c.v}</dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="mt-auto flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-muted">Source : {s.source}</span>
              {s.lien && (
                <a href={s.lien} target="_blank" rel="noreferrer" className="link text-xs">
                  Ouvrir
                </a>
              )}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
