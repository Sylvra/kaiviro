import type { Metadata } from "next";
import { Topbar } from "@/components/Topbar";
import { Pastille, Point, Source } from "@/components/ui";
import { chargerCloud, chargerPosture, chargerStockage } from "@/lib/donnees";
import type { Etat } from "@/lib/types";

export const metadata: Metadata = { title: "Security & Audit" };

const S5 = { source: "S5", libelle: "relevé de posture · lecture seule", exemple: false };

export default async function Securite() {
  const [posture, cloud, stockage] = await Promise.all([chargerPosture(), chargerCloud(), chargerStockage()]);
  const c = posture.controles;
  const compte = (e: Etat) => c.filter((x) => x.etat === e).length;
  const github = cloud.find((x) => x.id === "github");
  const visibilite = github?.champs.find((x) => x.k === "Visibilité")?.v;
  const sauvegardesOk = stockage.sauvegardes.length > 0 && stockage.sauvegardes.every((x) => x.etat === "ok");

  const acces: { titre: string; etat: Etat; constat: string }[] = [
    {
      titre: "Dépôt GitHub",
      etat: visibilite === "Public" ? "attention" : visibilite ? "ok" : "inconnu",
      constat: visibilite === "Public" ? "Public : issues, docs et code sont visibles de tous" : visibilite ? "Privé" : "Visibilité inconnue",
    },
    {
      titre: "Sauvegardes",
      etat: stockage.sauvegardes.length === 0 ? "inconnu" : sauvegardesOk ? "ok" : "attention",
      constat: sauvegardesOk ? "Chiffrées (restic), SSD et Google Drive, restaurations vérifiées" : "Voir Backups & Storage",
    },
    { titre: "Écritures depuis NEXUS", etat: "ok", constat: "Aucune : NEXUS est en lecture seule, tous les boutons d’action sont inactifs" },
    { titre: "Secrets de NEXUS", etat: "ok", constat: "Jetons dans .env.local, côté serveur, jamais affichés ni commités" },
  ];

  return (
    <>
      <Topbar miettes={[{ label: "Intelligence & Administration" }, { label: "Security & Audit" }]} />

      <div className="flex flex-wrap items-baseline gap-2.5 px-5 pb-2.5 pt-5 sm:px-9">
        <h1 className="m-0 mr-3 text-[22px] font-bold tracking-[-0.02em]">Security & Audit</h1>
        <span className="text-xs text-muted">Posture de la Pi, accès, journal d’audit</span>
        <span className="flex-1" />
        <Source p={S5} />
      </div>

      <div className="flex flex-col gap-4 px-5 pb-8 sm:px-9">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(
            [
              ["ok", "Conformes"],
              ["attention", "À corriger"],
              ["alerte", "Alertes"],
              ["inconnu", "Non relevés"],
            ] as const
          ).map(([e, label]) => (
            <div key={e} className="card fade-up flex flex-col gap-1 rounded-[14px] px-4 py-3">
              <span className="flex items-center gap-2 text-xs text-muted">
                <Point etat={e} />
                {label}
              </span>
              <b className="text-[26px] font-bold tracking-[-0.03em]">{posture.configure ? compte(e) : "—"}</b>
            </div>
          ))}
        </div>

        <section aria-labelledby="posture" className="card min-w-0 overflow-x-auto rounded-[14px]">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-3.5 pb-1 pt-4">
            <h2 id="posture" className="m-0 text-[15px] font-semibold">
              Posture de la Raspberry Pi
            </h2>
            <span className="text-xs text-muted">Relevé horaire · rien n’est corrigé automatiquement</span>
          </div>
          {!posture.configure ? (
            <p className="m-0 px-3.5 py-6 text-[13px] text-muted">Posture inconnue : Prometheus non configuré.</p>
          ) : (
            <table className="w-full min-w-[720px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-xs text-muted">
                  {["Contrôle", "État", "Constat", "Référence"].map((h, i) => (
                    <th key={h} scope="col" className={`border-b border-line py-2.5 font-semibold ${i === 0 ? "pl-3.5" : "px-2"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {c.map((x) => (
                  <tr key={x.id} className="row-link">
                    <td className="border-b border-grid py-[11px] pl-3.5 font-semibold">{x.titre}</td>
                    <td className="border-b border-grid px-2 py-[11px]">
                      <Pastille etat={x.etat} />
                    </td>
                    <td className="border-b border-grid px-2 py-[11px] text-ink-2">{x.constat}</td>
                    <td className="border-b border-grid px-2 py-[11px] pr-3.5 font-mono text-xs text-muted">{x.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="m-0 px-3.5 py-2.5 text-xs text-muted">
            Corriger SSH, le pare-feu ou les mises à jour reste une action humaine avec sudo. NEXUS constate seulement.
          </p>
        </section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <section aria-labelledby="acces" className="card flex flex-col gap-3 rounded-[14px] p-[18px]">
            <h2 id="acces" className="m-0 text-[15px] font-semibold">
              Accès et données
            </h2>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {acces.map((a) => (
                <li key={a.titre} className="flex items-start gap-2.5 rounded-[10px] border border-line px-3 py-2.5 text-[13px]">
                  <span className="mt-1.5">
                    <Point etat={a.etat} />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <b className="font-semibold">{a.titre}</b>
                    <span className="text-ink-2">{a.constat}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="audit" className="card flex flex-col gap-2 rounded-[14px] p-[18px]">
            <h2 id="audit" className="m-0 text-[15px] font-semibold">
              Journal d’audit
            </h2>
            <span className="self-start">
              <Pastille etat="inconnu">Vide par construction</Pastille>
            </span>
            <p className="m-0 text-[13px] text-ink-2">
              Le journal enregistre chaque écriture N2 et N3 (schéma <code className="font-mono text-xs">audit-event</code>). NEXUS n’écrit encore
              rien : il n’y a donc rien à auditer. Il s’ouvrira avec l’API d’administration et l’authentification (ADR-0012).
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
