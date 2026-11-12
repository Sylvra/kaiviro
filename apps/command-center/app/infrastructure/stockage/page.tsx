import type { Metadata } from "next";
import { Topbar } from "@/components/Topbar";
import { Pastille, Point, Source } from "@/components/ui";
import { chargerStockage } from "@/lib/donnees";
import { age } from "@/lib/s6/sauvegardes";

export const metadata: Metadata = { title: "Backups & Storage" };

const S5 = { source: "S5", libelle: "Node Exporter · smartmon", exemple: false };

/** Périmètres de sauvegarde prévus (BACKUP_AND_RESTORE §2). Aucun n'existe encore. */
const PERIMETRES = [
  { id: "pi-config", contenu: "SSH, supervision, unités systemd, /opt/kaiviro", frequence: "quotidienne" },
  { id: "pi-monitoring-data", contenu: "Données d’Uptime Kuma et de Grafana", frequence: "quotidienne" },
  { id: "admin-db", contenu: "Schéma admin (CRM, incidents, audit)", frequence: "selon l’hébergeur (ADR-0004)" },
];

export default async function Stockage() {
  const s = await chargerStockage();
  const maintenant = Math.floor(Date.now() / 1000);
  const etats = (id: string) => s.sauvegardes.filter((x) => x.perimetre === id);
  const depotOk = (d: string) => {
    const e = etats("pi-config").filter((x) => x.depot === d);
    return e.length === 2 && e.every((x) => x.etat === "ok");
  };
  const configOk = depotOk("local");
  const driveOk = depotOk("offsite");

  return (
    <>
      <Topbar miettes={[{ label: "Infrastructure" }, { label: "Backups & Storage" }]} />

      <div className="flex flex-wrap items-baseline gap-2.5 px-5 pb-2.5 pt-5 sm:px-9">
        <h1 className="m-0 mr-3 text-[22px] font-bold tracking-[-0.02em]">Backups & Storage</h1>
        <span className="text-xs text-muted">Disques de la Pi et sauvegardes KAIVIRO</span>
        <span className="flex-1" />
        <Source p={S5} />
      </div>

      <div className="flex flex-col gap-4 px-5 pb-8 sm:px-9">
        {s.sauvegardes.length === 0 ? (
          <p role="note" className="m-0 rounded-xl px-3.5 py-3 text-[13px] text-crit-ink" style={{ background: "var(--crit-bg)" }}>
            <b className="font-semibold">Aucune sauvegarde KAIVIRO mesurée.</b> La recette M0 exige une sauvegarde et une restauration de test
            réussie (BACKUP_AND_RESTORE).
          </p>
        ) : configOk && driveOk ? (
          <p role="note" className="m-0 rounded-xl bg-accent-soft px-3.5 py-3 text-[13px] text-accent-ink">
            <b className="font-semibold">Configuration de la Pi : trois copies, restaurations vérifiées.</b> Sur la Pi, sur le SSD et sur Google
            Drive (dépôt chiffré, Google ne voit que des blocs chiffrés).
          </p>
        ) : configOk ? (
          <p role="note" className="m-0 rounded-xl bg-warn-bg px-3.5 py-3 text-[13px] text-warn-ink">
            <b className="font-semibold">Configuration de la Pi sauvegardée et restauration vérifiée.</b> Copie sur le SSD seulement : la copie hors
            site sur Google Drive (règle 3-2-1) n’est pas encore en place.
          </p>
        ) : null}

        <section aria-labelledby="disques" className="card min-w-0 overflow-x-auto rounded-[14px]">
          <div className="flex items-baseline justify-between px-3.5 pb-1 pt-4">
            <h2 id="disques" className="m-0 text-[15px] font-semibold">
              Disques
            </h2>
            <span className="text-xs text-muted">Raspberry Pi 5</span>
          </div>
          {!s.joignable ? (
            <p className="m-0 px-3.5 py-6 text-[13px] text-muted">Disques inconnus : Prometheus non joint.</p>
          ) : (
            <table className="w-full min-w-[760px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-xs text-muted">
                  {["Montage", "Support", "Taille", "Occupation", "Santé", "Heures de marche", "Température"].map((h, i) => (
                    <th key={h} scope="col" className={`border-b border-line py-2.5 font-semibold ${i === 0 ? "pl-3.5" : "px-2"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.disques.map((d) => (
                  <tr key={d.point} className="row-link">
                    <td className="border-b border-grid py-[11px] pl-3.5">
                      <span className="font-mono text-xs font-semibold">{d.point}</span>
                      <span className="ml-2 font-mono text-[11px] text-muted">{d.peripherique}</span>
                    </td>
                    <td className="border-b border-grid px-2 py-[11px]">{d.support}</td>
                    <td className="border-b border-grid px-2 py-[11px] font-mono text-xs">{d.tailleGo} Go</td>
                    <td className="border-b border-grid px-2 py-[11px]">
                      {Number.isNaN(d.occupePct) ? (
                        <span className="text-faint">—</span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-grid" aria-hidden="true">
                            <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(d.occupePct, 2)}%` }} />
                          </span>
                          <span className="font-mono text-xs">{d.occupePct} %</span>
                        </span>
                      )}
                    </td>
                    <td className="border-b border-grid px-2 py-[11px]">
                      <Pastille etat={d.sante.etat}>{d.sante.libelle}</Pastille>
                    </td>
                    <td className="border-b border-grid px-2 py-[11px] font-mono text-xs">{d.heures === undefined ? "—" : `${d.heures} h`}</td>
                    <td className="border-b border-grid px-2 py-[11px] pr-3.5 font-mono text-xs">{d.temperature === undefined ? "—" : `${d.temperature} °C`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <section aria-labelledby="perimetres" className="card flex flex-col gap-3 rounded-[14px] p-[18px]">
            <h2 id="perimetres" className="m-0 text-[15px] font-semibold">
              Sauvegardes prévues
            </h2>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {PERIMETRES.map((p) => {
                const e = etats(p.id);
                return (
                  <li key={p.id} className="flex flex-col gap-2 rounded-[10px] border border-line px-3 py-2.5 text-[13px]">
                    <span className="flex items-start gap-2.5">
                      <span className="mt-1.5">
                        <Point etat={e.length ? (e.some((x) => x.etat === "alerte") ? "alerte" : e.some((x) => x.etat === "attention") ? "attention" : "ok") : "inconnu"} />
                      </span>
                      <span className="flex flex-1 flex-col gap-0.5">
                        <span className="font-mono text-xs font-semibold">{p.id}</span>
                        <span className="text-ink-2">{p.contenu}</span>
                      </span>
                      {e.length === 0 && <span className="text-xs text-muted">jamais exécutée · {p.frequence}</span>}
                    </span>
                    {e.map((x) => (
                      <span key={x.genre + x.depot} className="flex flex-wrap items-center gap-2 pl-[18px] text-xs">
                        <Pastille etat={x.etat}>{x.libelle}</Pastille>
                        <span className="text-ink-2">{x.genre === "backup" ? "Sauvegarde" : "Test de restauration"}</span>
                        <span className="text-muted">
                          {x.dernierSucces ? `succès ${age(x.dernierSucces, maintenant)}` : "aucun succès"} · dépôt {x.depot === "local" ? "SSD" : x.depot === "offsite" ? "Google Drive" : x.depot}
                        </span>
                      </span>
                    ))}
                  </li>
                );
              })}
            </ul>
            <span className="text-xs text-muted">
              Hors KAIVIRO : la Pi sauvegarde déjà le serveur Valheim personnel (timer valheim-backup). NEXUS ne le suit pas.
            </span>
          </section>

          <section aria-labelledby="maintenance" className="card flex flex-col gap-3 rounded-[14px] p-[18px]">
            <h2 id="maintenance" className="m-0 text-[15px] font-semibold">
              Maintenance du système
            </h2>
            <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
              <dt className="text-muted">Mises à jour en attente</dt>
              <dd className="m-0 font-medium">
                {s.majEnAttente === null ? "Inconnu" : `${s.majEnAttente} paquet${s.majEnAttente > 1 ? "s" : ""}`}
              </dd>
              <dt className="text-muted">Redémarrage requis</dt>
              <dd className="m-0 font-medium">{s.redemarrageRequis === null ? "Inconnu" : s.redemarrageRequis ? "Oui" : "Non"}</dd>
            </dl>
            <span className="text-xs text-muted">Appliquer les mises à jour reste une action humaine, avec sudo sur la Pi.</span>
          </section>
        </div>
      </div>
    </>
  );
}
