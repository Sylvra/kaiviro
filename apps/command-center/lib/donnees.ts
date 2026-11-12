/**
 * Point d'entrée unique des pages. S1 GitHub (projet) et S5 Prometheus (Raspberry Pi) si configurés ;
 * sinon données d'exemple, toujours marquées comme telles. Code serveur uniquement.
 */
import { cache } from "react";
import * as ex from "./data/exemple";
import { githubConfigure, lireCi, lireDepot, lireDossier, lireEvenements, lireFichier, lireIssues } from "./s1/github";
import { trierDecisions, versDecision, type Decision } from "./s1/decisions";
import { versAdr, type Adr } from "./s2/adr";
import { activiteParJour, calculerPlan, enRetard, estDecision, etatCi, jourParis, parMission, versTache } from "./s1/mapping";
import { prometheusConfigure, plage, requete } from "./s5/prometheus";
import { REQUETES, SERIES, duree, etatNoeud, valeur, versSerie, versServices } from "./s5/mapping";
import type { Etat, Noeud, Provenance, Tache } from "./types";

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
      href: "/projet",
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

/* ---------- S1 · Décisions, S2 · ADR ---------- */

export interface Liste<T> {
  elements: T[];
  /** Raison affichée quand la source ne répond pas ou n'est pas configurée. */
  absence?: string;
}

async function chargerDecisionsBrut(): Promise<Liste<Decision>> {
  if (!githubConfigure()) return { elements: [], absence: "GitHub non configuré" };
  const issues = await lireIssues();
  if (!issues) return { elements: [], absence: "GitHub injoignable" };
  return { elements: trierDecisions(issues.map(versDecision).filter((d): d is Decision => d !== null)) };
}
export const chargerDecisions = cache(chargerDecisionsBrut);

async function chargerAdrBrut(): Promise<Liste<Adr>> {
  if (!githubConfigure()) return { elements: [], absence: "GitHub non configuré" };
  const dossier = await lireDossier("docs/adr");
  if (!dossier) return { elements: [], absence: "GitHub injoignable" };
  const fichiers = dossier.filter((f) => f.type === "file" && /^ADR-\d{4}.*\.md$/.test(f.name));
  const textes = await Promise.all(fichiers.map((f) => lireFichier(f.path)));
  const adr = fichiers.map((f, i) => versAdr(f.path, textes[i] ?? "", f.html_url));
  return { elements: adr.sort((a, b) => a.id.localeCompare(b.id)) };
}
export const chargerAdr = cache(chargerAdrBrut);

/* ---------- S5 · Raspberry Pi ---------- */

export interface EtatPi {
  noeud: Noeud;
  /** Vrai si la fiche vient de Prometheus, faux si ce sont les données d'exemple. */
  mesure: boolean;
  cpu: number | null;
  temperature: number | null;
}

async function chargerPiBrut(): Promise<EtatPi> {
  const pi = ex.raspberryPi;
  if (!prometheusConfigure()) return { noeud: pi, mesure: false, cpu: null, temperature: null };

  const [services, demarrage, ventilateur, ssd, cpu, temperature, ...series] = await Promise.all([
    requete(REQUETES.services),
    requete(REQUETES.demarrage),
    requete(REQUETES.ventilateur),
    requete(REQUETES.ssd),
    requete(REQUETES.cpu),
    requete(REQUETES.temperature),
    ...SERIES.map((s) => plage(REQUETES[s.cle])),
  ]);
  const joignable = services !== null;
  const svc = versServices(services);
  const e = etatNoeud(svc, joignable);
  const occupationSsd = valeur(ssd);

  return {
    mesure: true,
    cpu: valeur(cpu),
    temperature: valeur(temperature),
    noeud: {
      ...pi,
      etat: e.etat,
      libelleEtat: e.libelle,
      provenance: { source: "S5", libelle: "Prometheus · Node Exporter", exemple: false },
      champs: [
        ...pi.champs.map((c) => {
          if (c.k !== "Refroidissement") return c;
          const tr = valeur(ventilateur);
          return { k: c.k, v: tr === null ? "Inconnu" : `Ventilateur actif · ${Math.round(tr)} tr/min` };
        }),
        { k: "Démarrée depuis", v: duree(valeur(demarrage)) },
        { k: "SSD /srv occupé", v: occupationSsd === null ? "Inconnu" : `${occupationSsd} %` },
      ],
      services: svc,
      series: SERIES.map((d, i) => versSerie(d, joignable ? (series[i] ?? null) : null)),
      chronologie: [
        { texte: "Supervision installée (Prometheus, Node Exporter)", meta: "2026-11-12 · paquets Debian", etat: "ok" },
        ...pi.chronologie.filter((c) => !c.texte.startsWith("Supervision prévue")),
      ],
    },
  };
}

/** Fiche de la Pi, lue une fois par requête. */
export const chargerPi = cache(chargerPiBrut);

/** Intègre l'état de la Pi à l'Overview : santé, sujets à traiter, état des sources. */
async function avecPi(t: Tableau): Promise<Tableau> {
  const { noeud, mesure } = await chargerPi();
  if (!mesure) return t;
  const etat: Etat = noeud.etat;
  const libelle = etat === "ok" ? "OK · mesurée" : noeud.libelleEtat;
  const aTraiter = t.aTraiter.filter((a) => a.titre !== "Raspberry Pi non supervisée");
  if (etat !== "ok")
    aTraiter.unshift({
      etat: etat === "alerte" ? "alerte" : etat === "attention" ? "attention" : "inconnu",
      titre: `Raspberry Pi : ${noeud.libelleEtat.replace(/^Inconnu · /, "")}`,
      detail: "S5 · Prometheus",
      href: `/infrastructure/noeuds/${noeud.id}`,
    });
  return {
    ...t,
    etatSources: t.connecte ? "S1 GitHub et S5 Pi branchés · autres sources non branchées" : `${t.etatSources} · S5 Pi branché`,
    aTraiter,
    sante: t.sante.map((s) => (s.nom === "Raspberry Pi 5" ? { ...s, etat, libelle } : s)),
  };
}

/** Une seule lecture par requête, partagée par la barre, la palette et la page. */
export const chargerTableau = cache(async () => avecPi(await charger()));
