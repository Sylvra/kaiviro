import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { GhRepoEvent } from "@/lib/activity";

/**
 * S1 / S2 — GitHub (lecture seule par défaut).
 * Le jeton reste côté serveur : il n'est jamais renvoyé au navigateur ni journalisé.
 */
const API = "https://api.github.com";

export function githubConfigured(): boolean {
  return Boolean(process.env.GITHUB_REPO?.trim() && process.env.GITHUB_TOKEN?.trim());
}

function headers(): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    Authorization: `Bearer ${process.env.GITHUB_TOKEN ?? ""}`,
    "User-Agent": "kaiviro-command-center",
  };
}

/** revalidate = 0 : pas de cache, pour les données modifiables depuis le Command Center. */
async function gh<T>(path: string, revalidate = 300): Promise<{ data: T; fetchedAt: string } | null> {
  if (!githubConfigured()) return null;
  try {
    const cache: RequestInit = revalidate === 0 ? { cache: "no-store" } : { next: { revalidate } };
    const res = await fetch(`${API}${path}`, { headers: headers(), ...cache });
    if (!res.ok) {
      console.warn(`[S1] GitHub ${res.status} sur ${path.split("?")[0]}`);
      return null;
    }
    return { data: (await res.json()) as T, fetchedAt: new Date().toISOString() };
  } catch (e) {
    // Les erreurs internes de Next (rendu dynamique, redirection) doivent remonter, sinon la page est figée au build.
    unstable_rethrow(e);
    console.warn(`[S1] GitHub injoignable sur ${path.split("?")[0]} : ${(e as { cause?: { code?: string } }).cause?.code ?? (e as Error).message}`);
    return null;
  }
}

/** Métadonnées du dépôt (date de création : début du plan M0 par défaut). Cache d'une heure. */
export async function getRepo() {
  return gh<{ full_name: string; created_at: string }>(`/repos/${process.env.GITHUB_REPO}`, 3600);
}

export async function pingGithub(): Promise<boolean> {
  const r = await gh<{ full_name: string }>(`/repos/${process.env.GITHUB_REPO}`, 60);
  return r !== null;
}

export interface GhIssue {
  number: number;
  title: string;
  state: "open" | "closed";
  html_url: string;
  labels: { name: string }[];
  assignees: { login: string }[];
  milestone: { title: string; due_on: string | null } | null;
  pull_request?: unknown;
  body: string | null;
}

export async function listIssues(label: string) {
  const r = await gh<GhIssue[]>(`/repos/${process.env.GITHUB_REPO}/issues?state=all&per_page=100&labels=${encodeURIComponent(label)}`, 0);
  if (!r) return null;
  return { issues: r.data.filter((i) => !i.pull_request), fetchedAt: r.fetchedAt };
}

export async function getIssue(n: number) {
  return gh<GhIssue>(`/repos/${process.env.GITHUB_REPO}/issues/${n}`, 0);
}

export interface GhComment { id: number; body: string | null; user: { login: string } | null; created_at: string; html_url: string }
export async function listComments(n: number) {
  return gh<GhComment[]>(`/repos/${process.env.GITHUB_REPO}/issues/${n}/comments?per_page=100`, 0);
}

export type WriteResult = { ok: true; issue: GhIssue } | { ok: false; status: number };

async function write<T>(method: "POST" | "PATCH", path: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  if (!githubConfigured()) return { ok: false, status: 503 };
  try {
    const res = await fetch(`${API}/repos/${process.env.GITHUB_REPO}${path}`, {
      method,
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[S1] GitHub ${res.status} sur ${method} ${path}`);
      return { ok: false, status: res.status };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch (e) {
    console.warn(`[S1] GitHub injoignable sur ${method} ${path} : ${(e as { cause?: { code?: string } }).cause?.code ?? (e as Error).message}`);
    return { ok: false, status: 502 };
  }
}

const asIssue = (r: { ok: true; data: GhIssue } | { ok: false; status: number }): WriteResult =>
  r.ok ? { ok: true, issue: r.data } : r;

/** Niveau 2 (ADR-0012) : modifie titre, corps, labels et/ou état d'une issue. Exige un jeton avec Issues: write. */
export async function updateIssue(n: number, patch: { title?: string; body?: string; labels?: string[]; state?: "open" | "closed"; state_reason?: "completed" | "reopened" }): Promise<WriteResult> {
  return asIssue(await write<GhIssue>("PATCH", `/issues/${n}`, patch));
}

export async function createIssue(issue: { title: string; body: string; labels: string[] }): Promise<WriteResult> {
  return asIssue(await write<GhIssue>("POST", "/issues", issue));
}

export async function commentIssue(n: number, body: string) {
  const r = await write<{ id: number }>("POST", `/issues/${n}/comments`, { body });
  return r.ok ? { ok: true as const } : r;
}

export interface GhBranch { name: string; protected: boolean }
export async function listBranches() {
  return gh<GhBranch[]>(`/repos/${process.env.GITHUB_REPO}/branches?per_page=100`);
}

export interface GhCommit { sha: string; html_url: string; commit: { message: string; author: { name: string; date: string } | null } }
/** Dernier commit d'une branche (null si la branche n'existe pas ou si GitHub ne répond pas). */
export async function getBranchHead(branch: string) {
  return gh<GhCommit>(`/repos/${process.env.GITHUB_REPO}/commits/${encodeURIComponent(branch)}`, 120);
}

/** Commits d'avance d'une branche sur sa base. */
export async function compareBranch(base: string, branch: string) {
  return gh<{ ahead_by: number; behind_by: number }>(`/repos/${process.env.GITHUB_REPO}/compare/${encodeURIComponent(base)}...${encodeURIComponent(branch)}`, 120);
}

/** Flux d'activité du dépôt (90 derniers jours côté GitHub), mis en cache une minute. */
export async function listRepoEvents() {
  return gh<GhRepoEvent[]>(`/repos/${process.env.GITHUB_REPO}/events?per_page=60`, 60);
}

export interface GhPull { number: number; title: string; html_url: string; head: { ref: string }; draft: boolean }
export async function listOpenPulls() {
  return gh<GhPull[]>(`/repos/${process.env.GITHUB_REPO}/pulls?state=open&per_page=50`);
}

/** Exécutions GitHub Actions. Le jeton doit avoir « Actions : read » ; sinon 403 et la carte CI reste « inconnue ». */
export async function listWorkflowRuns() {
  return gh<unknown>(`/repos/${process.env.GITHUB_REPO}/actions/runs?per_page=30`, 60);
}

export interface GhContent { name: string; path: string; download_url: string | null; type: string }
export async function listAdrFiles(ref = "develop") {
  return gh<GhContent[]>(`/repos/${process.env.GITHUB_REPO}/contents/docs/adr?ref=${ref}`);
}

export async function readRaw(url: string): Promise<string | null> {
  if (!githubConfigured()) return null;
  try {
    const res = await fetch(url, { headers: headers(), next: { revalidate: 300 } });
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}
