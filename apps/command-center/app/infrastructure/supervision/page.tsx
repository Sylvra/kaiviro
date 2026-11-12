import type { Metadata } from "next";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { Pastille, Point, Source } from "@/components/ui";
import { chargerSupervision } from "@/lib/donnees";
import { heureParis } from "@/lib/s5/mapping";
import { jourParis } from "@/lib/s1/mapping";
import type { Etat } from "@/lib/types";

export const metadata: Metadata = { title: "Monitoring & Metrics" };

const S5 = { source: "S5", libelle: "API de statut Prometheus", exemple: false };

export default async function Supervision() {
  const s = await chargerSupervision();
  const collectees = s.cibles.filter((c) => c.etat === "ok").length;
  const indisponible = !s.configure ? "Prometheus non configuré (PROMETHEUS_URL)" : !s.joignable ? "Prometheus injoignable" : null;

  const tuiles: { label: string; v: string; etat: Etat }[] = [
    {
      label: "Cibles collectées",
      v: s.joignable ? `${collectees} / ${s.cibles.length}` : "—",
      etat: !s.joignable ? "inconnu" : collectees === s.cibles.length ? "ok" : "alerte",
    },
    { label: "Séries en mémoire", v: s.series?.toLocaleString("fr-FR") ?? "—", etat: s.series === null ? "inconnu" : "ok" },
    { label: "Historique disponible", v: s.couvertureHeures === null ? "—" : `${s.couvertureHeures} h`, etat: s.couvertureHeures === null ? "inconnu" : "ok" },
    { label: "Règles d’alerte", v: s.regles === null ? "—" : String(s.regles), etat: s.regles === null ? "inconnu" : s.regles === 0 ? "attention" : "ok" },
  ];

  return (
    <>
      <Topbar miettes={[{ label: "Infrastructure" }, { label: "Monitoring & Metrics" }]} />

      <div className="flex flex-wrap items-baseline gap-2.5 px-5 pb-2.5 pt-5 sm:px-9">
        <h1 className="m-0 mr-3 text-[22px] font-bold tracking-[-0.02em]">Monitoring & Metrics</h1>
        <span className="text-xs text-muted">Collecte, moniteurs et alertes</span>
        <span className="flex-1" />
        <Source p={S5} />
      </div>

      <div className="flex flex-col gap-4 px-5 pb-8 sm:px-9">
        {indisponible && (
          <p role="note" className="m-0 rounded-xl bg-warn-bg px-3.5 py-3 text-[13px] text-warn-ink">
            <b className="font-semibold">{indisponible}.</b> Tous les indicateurs ci-dessous restent « Inconnu ».
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tuiles.map((t) => (
            <div key={t.label} className="card fade-up flex flex-col gap-1 rounded-[14px] px-4 py-3">
              <span className="flex items-center gap-2 text-xs text-muted">
                <Point etat={t.etat} />
                {t.label}
              </span>
              <b className="text-[26px] font-bold tracking-[-0.03em]">{t.v}</b>
            </div>
          ))}
        </div>

        <section aria-labelledby="cibles" className="card min-w-0 overflow-x-auto rounded-[14px]">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-3.5 pb-1 pt-4">
            <h2 id="cibles" className="m-0 text-[15px] font-semibold">
              Cibles de collecte
            </h2>
            <span className="font-mono text-[11px] text-muted">
              Prometheus {s.version ?? "version inconnue"} · rétention {s.retention ?? "inconnue"}
              {s.demarreLe ? ` · démarré le ${jourParis(s.demarreLe)}` : ""}
            </span>
          </div>
          {s.cibles.length === 0 ? (
            <p className="m-0 px-3.5 py-6 text-[13px] text-muted">Aucune cible lisible.</p>
          ) : (
            <table className="w-full min-w-[680px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-xs text-muted">
                  {["Cible", "Adresse", "État", "Dernière collecte", "Durée", "Intervalle"].map((h, i) => (
                    <th key={h} scope="col" className={`border-b border-line py-2.5 font-semibold ${i === 0 ? "pl-3.5" : "px-2"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.cibles.map((c) => (
                  <tr key={c.adresse} className="row-link">
                    <td className="border-b border-grid py-[11px] pl-3.5 font-semibold">{c.job}</td>
                    <td className="border-b border-grid px-2 py-[11px] font-mono text-xs text-ink-2">{c.adresse}</td>
                    <td className="border-b border-grid px-2 py-[11px]">
                      <Pastille etat={c.etat}>{c.libelle}</Pastille>
                      {c.erreur && <span className="ml-2 text-xs text-crit-ink">{c.erreur}</span>}
                    </td>
                    <td className="border-b border-grid px-2 py-[11px] font-mono text-xs">{heureParis(c.derniereCollecte)}</td>
                    <td className="border-b border-grid px-2 py-[11px] font-mono text-xs">{c.dureeMs === null ? "—" : `${c.dureeMs} ms`}</td>
                    <td className="border-b border-grid px-2 py-[11px] pr-3.5 font-mono text-xs">{c.intervalle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <section aria-labelledby="alertes" className="card flex flex-col gap-2 rounded-[14px] p-[18px]">
            <h2 id="alertes" className="m-0 text-[15px] font-semibold">
              Alertes
            </h2>
            <p className="m-0 text-[13px] text-ink-2">
              {s.regles === 0
                ? "Aucune règle d’alerte. Les seuils seront fixés après une période d’observation (ADR-0010), jamais devinés."
                : s.regles === null
                  ? "Règles inconnues."
                  : `${s.regles} règle${s.regles > 1 ? "s" : ""} chargée${s.regles > 1 ? "s" : ""}.`}
            </p>
            <span className="text-xs text-muted">Notifications (ntfy) : non installées.</span>
          </section>
          <section aria-labelledby="moniteurs" className="card flex flex-col gap-2 rounded-[14px] p-[18px]">
            <h2 id="moniteurs" className="m-0 text-[15px] font-semibold">
              Moniteurs de disponibilité
            </h2>
            <span className="self-start">
              <Pastille etat="inconnu">Uptime Kuma non installé</Pastille>
            </span>
            <p className="m-0 text-[13px] text-ink-2">
              Étape 1 d’ADR-0010. Aucune sonde externe ne vérifie encore les services. Les métriques de la Pi sont sur sa{" "}
              <Link href="/infrastructure/noeuds/raspberry-pi-5" className="link">
                fiche
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
