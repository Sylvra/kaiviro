import "server-only";

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
    console.warn(`[S1] GitHub injoignable sur ${path.split("?")[0]} : ${(e as { cause?: { code?: string } }).cause?.code ?? (e as Error).message}`);
    return null;
  }
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

export type WriteResult = { ok: true; issue: GhIssue } | { ok: false; status: number };

/** Niveau 2 (ADR-0012) : modifie les labels et l'état d'une issue. Exige un jeton avec Issues: write. */
export async function updateIssue(n: number, patch: { labels: string[]; state: "open" | "closed" }): Promise<WriteResult> {
  if (!githubConfigured()) return { ok: false, status: 503 };
  try {
    const res = await fetch(`${API}/repos/${process.env.GITHUB_REPO}/issues/${n}`, {
      method: "PATCH",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify(patch),
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, issue: (await res.json()) as GhIssue };
  } catch {
    return { ok: false, status: 502 };
  }
}

export interface GhBranch { name: string; protected: boolean }
export async function listBranches() {
  return gh<GhBranch[]>(`/repos/${process.env.GITHUB_REPO}/branches?per_page=100`);
}

export interface GhPull { number: number; title: string; html_url: string; head: { ref: string }; draft: boolean }
export async function listOpenPulls() {
  return gh<GhPull[]>(`/repos/${process.env.GITHUB_REPO}/pulls?state=open&per_page=50`);
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
