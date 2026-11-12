/**
 * S1 · GitHub : conversion des issues, événements et exécutions CI en objets NEXUS.
 * Fonctions pures, sans réseau, testées dans mapping.test.ts.
 * Conventions de labels du dépôt (docs/roadmap/M0_PLAN.md) :
 *   livrable | decision, mission:a|b|commun, status:todo|doing|review|done, jours:X-Y.
 */
import type { EvenementChrono, Mission, StatutTache, Tache } from "../types";

export interface GhIssue {
  number: number;
  title: string;
  state: "open" | "closed";
  html_url: string;
  labels: { name: string }[];
  assignees: { login: string }[];
  created_at: string;
  closed_at: string | null;
  body: string | null;
  pull_request?: unknown;
}

export interface GhEvent {
  type: string;
  created_at: string;
}

export interface GhRun {
  head_branch: string;
  status: string;
  conclusion: string | null;
  name: string;
  created_at: string;
}

const JOUR_MS = 86_400_000;

const labels = (i: GhIssue) => i.labels.map((l) => l.name);
const prefixe = (i: GhIssue, p: string) => labels(i).find((l) => l.startsWith(p))?.slice(p.length);

/** Date calendaire à Paris, au format AAAA-MM-JJ. */
export function jourParis(d: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(typeof d === "string" ? new Date(d) : d);
}

/** Écart en jours calendaires entre deux dates AAAA-MM-JJ. */
export function ecartJours(de: string, a: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / JOUR_MS);
}

/** Jour du plan, J1 étant la date de début. */
export function jourDuPlan(debut: string, maintenant: Date): number {
  return ecartJours(debut, jourParis(maintenant)) + 1;
}

/** Fenêtre « jours:3-4 » : début et fin, ou null si le label manque. */
export function fenetre(i: GhIssue): { debut: number; fin: number } | null {
  const m = prefixe(i, "jours:")?.match(/^(\d+)-(\d+)$/);
  return m ? { debut: Number(m[1]), fin: Number(m[2]) } : null;
}

export function statut(i: GhIssue): StatutTache {
  if (i.state === "closed") return "done";
  const s = prefixe(i, "status:");
  return s === "doing" || s === "review" || s === "done" ? s : "todo";
}

export function mission(i: GhIssue): Mission | null {
  const m = prefixe(i, "mission:");
  return m === "a" ? "A" : m === "b" ? "B" : m === "commun" ? "C" : null;
}

const estLivrable = (i: GhIssue) => !i.pull_request && labels(i).includes("livrable");
export const estDecision = (i: GhIssue) => !i.pull_request && labels(i).includes("decision");

/** Chemin déclaré dans le corps de l'issue : « Chemin : `docs/...` ». */
export function chemin(body: string | null): string | undefined {
  return body?.match(/Chemin\s*:\s*`([^`]+)`/)?.[1];
}

export function versTache(i: GhIssue, jourCourant: number): Tache | null {
  const f = fenetre(i);
  const m = mission(i);
  if (!estLivrable(i) || !f || !m) return null;
  const chrono: EvenementChrono[] = [];
  if (i.closed_at) chrono.push({ texte: "Issue fermée", meta: `GitHub · ${jourParis(i.closed_at)}`, etat: "done" });
  chrono.push({ texte: `Issue #${i.number} ouverte`, meta: `GitHub · ${jourParis(i.created_at)}`, etat: "inconnu" });
  return {
    id: `gh-${i.number}`,
    titre: i.title,
    statut: statut(i),
    mission: m,
    fenetre: f.debut === f.fin ? `J${f.fin}` : `J${f.debut}–J${f.fin}`,
    echeanceJours: f.fin - jourCourant,
    relations: [],
    chemin: chemin(i.body),
    assignees: i.assignees.length ? i.assignees.map((a) => a.login).join(", ") : undefined,
    lien: i.html_url,
    chronologie: chrono,
  };
}

export interface Plan {
  jourCourant: number;
  duree: number;
  total: number;
  prevu: number[];
  termine: number[];
}

/** Courbe cumulée : prévu par fin de fenêtre, terminé par date de fermeture. */
export function calculerPlan(issues: GhIssue[], debut: string, maintenant: Date): Plan {
  const livrables = issues.filter((i) => estLivrable(i) && fenetre(i));
  const fins = livrables.map((i) => fenetre(i)!.fin);
  const duree = Math.max(1, ...fins);
  const jourCourant = Math.min(Math.max(jourDuPlan(debut, maintenant), 1), duree);
  const prevu = Array.from({ length: duree }, (_, d) => fins.filter((f) => f <= d + 1).length);
  const fermetures = livrables.filter((i) => i.closed_at).map((i) => ecartJours(debut, jourParis(i.closed_at!)) + 1);
  const termine = Array.from({ length: jourCourant }, (_, d) => fermetures.filter((j) => j <= d + 1).length);
  return { jourCourant, duree, total: livrables.length, prevu, termine };
}

export interface LigneMission {
  nom: string;
  termine: number;
  revue: number;
  cours: number;
  afaire: number;
  retard: number;
}

export const enRetard = (t: Tache) => t.statut !== "done" && t.echeanceJours < 0;

export function parMission(taches: Tache[]): LigneMission[] {
  const noms: Record<Mission, string> = { A: "Mission A", B: "Mission B", C: "Commun" };
  return (["A", "B", "C"] as const).map((m) => {
    const t = taches.filter((x) => x.mission === m);
    const n = (s: StatutTache) => t.filter((x) => x.statut === s).length;
    return { nom: noms[m], termine: n("done"), revue: n("review"), cours: n("doing"), afaire: n("todo"), retard: t.filter(enRetard).length };
  });
}

/** Événements du dépôt par jour sur les `n` derniers jours, à l'heure de Paris. */
export function activiteParJour(evts: GhEvent[], maintenant: Date, n = 14) {
  const fin = jourParis(maintenant);
  const dates = Array.from({ length: n }, (_, k) => jourParis(new Date(Date.parse(`${fin}T12:00:00Z`) - (n - 1 - k) * JOUR_MS)));
  const nombres = dates.map((d) => evts.filter((e) => jourParis(e.created_at) === d).length);
  const jours = dates.map((d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`);
  return { dates, jours, nombres };
}

/**
 * État de la CI d'après la dernière exécution terminée (les workflows tournent sur les PR vers develop et main).
 * Les exécutions arrivent de GitHub de la plus récente à la plus ancienne.
 */
export function etatCi(runs: GhRun[] | null): { etat: "ok" | "alerte" | "inconnu"; libelle: string } {
  if (!runs) return { etat: "inconnu", libelle: "CI non lisible" };
  const r = runs.find((x) => x.status === "completed");
  if (!r) return { etat: "inconnu", libelle: "Aucune CI terminée" };
  return r.conclusion === "success"
    ? { etat: "ok", libelle: "OK · dernière CI verte" }
    : { etat: "alerte", libelle: `CI en échec sur ${r.head_branch}` };
}
