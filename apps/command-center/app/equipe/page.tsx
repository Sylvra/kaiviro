import type { Metadata } from "next";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { Pastille, Source } from "@/components/ui";
import { chargerDecisions, chargerTableau } from "@/lib/donnees";
import type { Porteur } from "@/lib/s1/decisions";

export const metadata: Metadata = { title: "Team & Members" };

/** Membres saisis dans NEXUS (NEXUS_SPEC_V2 §4.1). La charge vient de S1. */
const MEMBRES: { nom: string; initiales: string; nature: string; role: string; mission: string; porteur: Porteur; note?: string }[] = [
  { nom: "Johan", initiales: "JB", nature: "Humain", role: "Owner", mission: "Commun", porteur: "Humains" },
  { nom: "Le collègue", initiales: "?", nature: "Humain", role: "Administrateur", mission: "Commun", porteur: "Humains", note: "Pas encore ajouté au dépôt" },
  { nom: "Claude A", initiales: "CA", nature: "Agent IA", role: "Mission A · plateforme, NEXUS", mission: "Mission A", porteur: "Mission A" },
  { nom: "Claude B", initiales: "CB", nature: "Agent IA", role: "Mission B · produit, backend", mission: "Mission B", porteur: "Mission B" },
];

export default async function Equipe() {
  const [{ missions, connecte, tachesProvenance }, decisions] = await Promise.all([chargerTableau(), chargerDecisions()]);
  const ligne = (m: string) => missions.find((x) => x.nom === m);
  const aTrancher = (p: Porteur) => decisions.elements.filter((d) => !d.tranchee && d.porteur === p).length;

  return (
    <>
      <Topbar miettes={[{ label: "Workspace" }, { label: "Team & Members" }]} />

      <div className="flex flex-wrap items-baseline gap-2.5 px-5 pb-2.5 pt-5 sm:px-9">
        <h1 className="m-0 mr-3 text-[22px] font-bold tracking-[-0.02em]">Team & Members</h1>
        <span className="text-xs text-muted">Membres humains et agents, charge par mission</span>
        <span className="flex-1" />
        <Source p={tachesProvenance} suffixe="charge" />
      </div>

      <div className="flex flex-col gap-4 px-5 pb-8 sm:px-9">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {MEMBRES.map((m, i) => {
            const l = ligne(m.mission);
            const ouvertes = l ? l.revue + l.cours + l.afaire : null;
            return (
              <section
                key={m.nom}
                aria-labelledby={`membre-${i}`}
                className="card fade-up flex flex-col gap-3 rounded-[14px] p-[18px]"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-primary text-sm font-bold text-on-primary" aria-hidden="true">
                    {m.initiales}
                  </span>
                  <span className="flex flex-col">
                    <h2 id={`membre-${i}`} className="m-0 text-[15px] font-bold">
                      {m.nom}
                    </h2>
                    <span className="text-xs text-muted">
                      {m.nature} · {m.role}
                    </span>
                  </span>
                </div>
                <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px]">
                  <dt className="text-muted">Mission</dt>
                  <dd className="m-0 font-medium">{m.mission}</dd>
                  <dt className="text-muted">Tâches ouvertes</dt>
                  <dd className="m-0 font-medium">
                    {ouvertes ?? "Inconnu"}
                    {l && l.retard > 0 && <span className="text-crit-ink"> · {l.retard} en retard</span>}
                  </dd>
                  <dt className="text-muted">Décisions à trancher</dt>
                  <dd className="m-0 font-medium">{decisions.absence ? "Inconnu" : aTrancher(m.porteur)}</dd>
                </dl>
                {m.note && (
                  <span className="self-start">
                    <Pastille etat="attention">{m.note}</Pastille>
                  </span>
                )}
                {m.mission === "Commun" && <span className="text-[11px] text-muted">Tâches communes et décisions partagées entre les deux humains.</span>}
              </section>
            );
          })}
        </div>

        <p className="m-0 text-xs text-muted">
          Membres saisis dans NEXUS{connecte ? "" : " · charge d’exemple"}. Rôles et droits (ADR-0012) arrivent avec l’authentification. Les
          partenaires (CRM, données personnelles) ne sont pas encore ouverts. Voir aussi les{" "}
          <Link href="/projet" className="link">
            décisions
          </Link>{" "}
          et les{" "}
          <Link href="/taches" className="link">
            tâches
          </Link>
          .
        </p>
      </div>
    </>
  );
}
