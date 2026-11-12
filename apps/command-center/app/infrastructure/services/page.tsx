import type { Metadata } from "next";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { Exemple, Pastille, Point, Source } from "@/components/ui";
import { chargerPi } from "@/lib/donnees";

export const metadata: Metadata = { title: "Containers & Services" };

export default async function Services() {
  const { noeud: pi, mesure } = await chargerPi();
  const compte = (e: string) => pi.services.filter((s) => s.etat === e).length;

  return (
    <>
      <Topbar miettes={[{ label: "Infrastructure" }, { label: "Containers & Services" }]} />

      <div className="flex flex-wrap items-baseline gap-2.5 px-5 pb-2.5 pt-5 sm:px-9">
        <h1 className="m-0 mr-3 text-[22px] font-bold tracking-[-0.02em]">Containers & Services</h1>
        <span className="text-xs text-muted">Services systemd suivis, conteneurs, API</span>
        <span className="flex-1" />
        <Source p={pi.provenance} suffixe={mesure ? "systemd" : "jamais mesuré"} />
      </div>

      <div className="flex flex-col gap-4 px-5 pb-8 sm:px-9">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Actifs", n: compte("ok"), etat: "ok" as const },
            { label: "Arrêtés", n: compte("attention"), etat: "attention" as const },
            { label: "En échec", n: compte("alerte"), etat: "alerte" as const },
            { label: "Non mesurés", n: compte("inconnu"), etat: "inconnu" as const },
          ].map((k) => (
            <div key={k.label} className="card fade-up flex flex-col gap-1 rounded-[14px] px-4 py-3">
              <span className="flex items-center gap-2 text-xs text-muted">
                <Point etat={k.etat} />
                {k.label}
              </span>
              <b className="text-[26px] font-bold tracking-[-0.03em]">{k.n}</b>
            </div>
          ))}
        </div>

        <section aria-labelledby="systemd" className="card min-w-0 overflow-x-auto rounded-[14px]">
          <div className="flex items-baseline justify-between px-3.5 pb-1 pt-4">
            <h2 id="systemd" className="m-0 text-[15px] font-semibold">
              Services systemd {!mesure && <Exemple />}
            </h2>
            <span className="text-xs text-muted">{pi.services.length} suivis</span>
          </div>
          <table className="w-full min-w-[680px] border-collapse text-[13px]">
            <thead>
              <tr className="text-left text-xs text-muted">
                {["Service", "Hôte", "Rôle", "État", "Action prévue"].map((h, i) => (
                  <th key={h} scope="col" className={`border-b border-line py-2.5 font-semibold ${i === 0 ? "pl-3.5" : "px-2"}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pi.services.map((s) => (
                <tr key={s.nom} className="row-link">
                  <td className="border-b border-grid py-[11px] pl-3.5 font-mono text-xs font-semibold">{s.nom}</td>
                  <td className="border-b border-grid px-2 py-[11px] text-xs">
                    <Link href={`/infrastructure/noeuds/${pi.id}`} className="link">
                      {pi.nom}
                    </Link>
                  </td>
                  <td className="border-b border-grid px-2 py-[11px] text-ink-2">{s.role}</td>
                  <td className="border-b border-grid px-2 py-[11px]">
                    <Pastille etat={s.etat}>{s.libelleEtat}</Pastille>
                  </td>
                  <td className="border-b border-grid px-2 py-[11px] pr-3.5 text-xs text-ink-2">{s.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <section aria-labelledby="conteneurs" className="card flex flex-col gap-2 rounded-[14px] p-[18px]">
            <h2 id="conteneurs" className="m-0 text-[15px] font-semibold">
              Conteneurs
            </h2>
            <p className="m-0 text-[13px] text-ink-2">
              Aucun. La supervision tourne en paquets Debian, sans Docker. cAdvisor n’est donc pas installé.
            </p>
            <span className="font-mono text-[11px] text-muted">Constat du 2026-11-12 sur la Pi</span>
          </section>
          <section aria-labelledby="api" className="card flex flex-col gap-2 rounded-[14px] p-[18px]">
            <h2 id="api" className="m-0 text-[15px] font-semibold">
              API du backend
            </h2>
            <span className="self-start">
              <Pastille etat="inconnu">Non déployée</Pastille>
            </span>
            <p className="m-0 text-[13px] text-ink-2">
              Mission B. NEXUS lira <code className="font-mono text-xs">/health/details</code> (S7) quand l’API existera.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
