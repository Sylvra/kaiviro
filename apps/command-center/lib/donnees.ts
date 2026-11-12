/**
 * Point d'entrée unique des pages : données du connecteur S1 si GitHub est configuré et répond,
 * sinon données d'exemple, toujours marquées comme telles. Code serveur uniquement.
 */
import { cache } from "react";
import * as ex from "./data/exemple";
import { githubConfigure, lireCi, lireDepot, lireEvenements, lireIssues } from "./s1/github";
import { activiteParJour, calculerPlan, enRetard, estDecision, etatCi, jourParis, parMission, versTache } from "./s1/mapping";
import type { Provenance, Tache } from "./types";

/** Jalons du plan M0 (docs/roadmap/M0_PLAN.md §4), saisis dans NEXUS. */
const JALONS = [
  { libelle: "Atelier contrats", fenetre: "J3–J4", fin: 4 },
  { libelle: "Revue intermédiaire", fenetre: "J5–J6", fin: 6 },
  { libelle: "Recette", fenetre: "J10", fin: 10 },
];

export interface Tableau {
  /** Vrai si les données viennent de GitHub et non de lib/data/exemple.ts. */
  connecte: boolean;
  /** Libellé de l'état des sources, affiché dans la barre de page. */
  etatSources: string;
  plan: typeof ex.plan;
  aTraiter: ex.ATraiter[];
  missions: typeof ex.missions;
  activite: typeof ex.activite;
  sante: { nom: string; etat: "ok" | "attention" | "alerte" | "inconnu"; libelle: string }[];
  /** Tâches ouvertes, triées par fin de fenêtre. */
  taches: Tache[];
  tachesOuvertes: number;
  tachesProvenance: Provenance;
}

const s1 = (libelle: string): Provenance => ({ source: "S1", libelle, exemple: false });

/** Constats qui ne dépendent pas de GitHub : ils restent vrais tant que rien n'est branché ailleurs. */
const constatsHorsS1 = ex.aTraiter.slice(2);

function depuisExemple(raison: string): Tableau {
  return {
    connecte: false,
    etatSources: raison,
    plan: ex.plan,
    aTraiter: ex.aTraiter,
    missions: ex.missions,
    activite: ex.activite,
    sante: ex.sante,
    taches: ex.taches,
    tachesOuvertes: ex.tachesOuvertes,
    tachesProvenance: ex.tachesProvenance,
  };
}

async function charger(): Promise<Tableau> {
  if (!githubConfigure()) return depuisExemple("Données d’exemple · GitHub non configuré");
  const [depot, issues, evts, runs] = await Promise.all([lireDepot(), lireIssues(), lireEvenements(), lireCi()]);
  if (!depot || !issues) return depuisExemple("Données d’exemple · GitHub injoignable");

  const maintenant = new Date();
  const debut = process.env.PLAN_START?.trim() || jourParis(depot.created_at);
  const p = calculerPlan(issues, debut, maintenant);
  const toutes = issues.map((i) => versTache(i, p.jourCourant)).filter((t): t is Tache => t !== null);
  const ouvertes = toutes
    .filter((t) => t.statut !== "done")
    .sort((a, b) => a.echeanceJours - b.echeanceJours || a.titre.localeCompare(b.titre, "fr"));
  const retards = ouvertes.filter(enRetard);
  const decisions = issues.filter((i) => estDecision(i) && i.state === "open");
  const jalon = JALONS.find((j) => j.fin >= p.jourCourant) ?? JALONS.at(-1)!;
  const act = activiteParJour(evts ?? [], maintenant);
  const ci = etatCi(runs);

  const aTraiter: ex.ATraiter[] = [];
  if (retards.length)
    aTraiter.push({
      etat: "attention",
      titre: `${retards.length} tâche${retards.length > 1 ? "s" : ""} en retard`,
      detail: `${retards[0]!.titre}${retards.length > 1 ? ` · +${retards.length - 1}` : ""}`,
      href: `/taches?t=${retards[0]!.id}`,
    });
  if (decisions.length)
    aTraiter.push({
      etat: "attention",
      titre: `${decisions.length} décision${decisions.length > 1 ? "s" : ""} à trancher`,
      detail: `${decisions[0]!.title}${decisions.length > 1 ? ` · +${decisions.length - 1}` : ""}`,
    });
  if (ci.etat === "alerte") aTraiter.unshift({ etat: "alerte", titre: ci.libelle, detail: "GitHub Actions" });

  return {
    connecte: true,
    etatSources: "S1 GitHub branché · autres sources non branchées",
    plan: {
      provenance: s1(`GitHub Issues · J1 ${debut}`),
      jourCourant: p.jourCourant,
      duree: p.duree,
      total: p.total,
      jalon: jalon.libelle,
      jalons: JALONS.map(({ libelle, fenetre }) => ({ libelle, fenetre })),
      prevu: p.prevu,
      termine: p.termine,
    },
    aTraiter: [...aTraiter, ...constatsHorsS1],
    missions: parMission(toutes),
    activite: {
      provenance: s1(evts ? "Événements du dépôt" : "Événements illisibles"),
      jours: act.jours,
      nombres: act.nombres,
      indexJ1: act.dates.indexOf(debut),
    },
    sante: [{ nom: "GitHub", etat: ci.etat, libelle: ci.libelle }, ...ex.sante.slice(1)],
    taches: ouvertes,
    tachesOuvertes: ouvertes.length,
    tachesProvenance: s1("GitHub Issues"),
  };
}

/** Une seule lecture par requête, partagée par la barre, la palette et la page. */
export const chargerTableau = cache(charger);
