/**
 * S1 · GitHub, lecture seule. Uniquement des requêtes GET.
 * Le jeton vient de .env.local, reste côté serveur et n'est jamais journalisé.
 * Ce module ne doit être importé que par du code serveur (lib/donnees.ts).
 */
import type { GhEvent, GhIssue, GhRun } from "./mapping";

const API = "https://api.github.com";
/** Cache des réponses : cinq minutes. Les données restent celles de GitHub. */
const REVALIDATE = 300;

export function githubConfigure(): boolean {
  return Boolean(process.env.GITHUB_REPO?.trim() && process.env.GITHUB_TOKEN?.trim());
}

async function lire<T>(chemin: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}/repos/${process.env.GITHUB_REPO}${chemin}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        "User-Agent": "kaiviro-nexus",
      },
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) {
      console.warn(`[S1] GitHub ${res.status} sur ${chemin.split("?")[0]}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.warn(`[S1] GitHub injoignable sur ${chemin.split("?")[0]} : ${(e as Error).message}`);
    return null;
  }
}

export const lireDepot = () =>
  lire<{ created_at: string; pushed_at: string; default_branch: string; visibility: string; open_issues_count: number; html_url: string }>("");
export const lirePullsOuvertes = () => lire<{ number: number }[]>("/pulls?state=open&per_page=100");
export const lireIssues = () => lire<GhIssue[]>("/issues?state=all&per_page=100");
/** GitHub sert au plus 300 événements, par pages de 100 : on les lit toutes. */
export async function lireEvenements(): Promise<GhEvent[] | null> {
  const tous: GhEvent[] = [];
  for (let page = 1; page <= 3; page++) {
    const p = await lire<GhEvent[]>(`/events?per_page=100&page=${page}`);
    if (!p) return page === 1 ? null : tous;
    tous.push(...p);
    if (p.length < 100) break;
  }
  return tous;
}
/** S2 · contenu d'un dossier du dépôt sur une branche. */
export const lireDossier = (chemin: string, branche = "develop") =>
  lire<{ name: string; path: string; type: string; html_url: string }[]>(`/contents/${chemin}?ref=${encodeURIComponent(branche)}`);

/** S2 · texte brut d'un fichier du dépôt. */
export async function lireFichier(chemin: string, branche = "develop"): Promise<string | null> {
  try {
    const res = await fetch(`${API}/repos/${process.env.GITHUB_REPO}/contents/${chemin}?ref=${encodeURIComponent(branche)}`, {
      headers: {
        Accept: "application/vnd.github.raw+json",
        "X-GitHub-Api-Version": "2022-11-28",
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        "User-Agent": "kaiviro-nexus",
      },
      next: { revalidate: REVALIDATE },
    });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

/** Exige « Actions : read » sur le jeton ; sinon null et la CI reste « inconnue ». */
export const lireCi = async () => (await lire<{ workflow_runs: GhRun[] }>("/actions/runs?per_page=10"))?.workflow_runs ?? null;
