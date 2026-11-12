/**
 * S5 · Prometheus de la Pi, lecture seule (GET /api/v1/query et /api/v1/query_range).
 * Joint par le tailnet (PROMETHEUS_URL). Code serveur uniquement (lib/donnees.ts).
 */
import type { CibleBrute, Echantillon, SerieBrute } from "./mapping";

/** Cache court : la fiche reste proche du temps réel sans interroger la Pi à chaque requête. */
const REVALIDATE = 30;

export const prometheusConfigure = () => Boolean(process.env.PROMETHEUS_URL?.trim());

async function lire<T>(chemin: string, params: Record<string, string>): Promise<T | null> {
  const base = process.env.PROMETHEUS_URL!.trim().replace(/\/$/, "");
  try {
    const res = await fetch(`${base}${chemin}?${new URLSearchParams(params)}`, {
      next: { revalidate: REVALIDATE },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      console.warn(`[S5] Prometheus ${res.status} sur ${chemin}`);
      return null;
    }
    const corps = (await res.json()) as { status: string; data?: { result: T } };
    return corps.status === "success" && corps.data ? corps.data.result : null;
  } catch (e) {
    console.warn(`[S5] Prometheus injoignable : ${(e as Error).message}`);
    return null;
  }
}

export const requete = (q: string) => lire<Echantillon[]>("/api/v1/query", { query: q });

/** Réponse brute de l'API de statut (champ data entier). */
async function lireData<T>(chemin: string): Promise<T | null> {
  const base = process.env.PROMETHEUS_URL!.trim().replace(/\/$/, "");
  try {
    const res = await fetch(`${base}${chemin}`, { next: { revalidate: REVALIDATE }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const corps = (await res.json()) as { status: string; data?: T };
    return corps.status === "success" && corps.data ? corps.data : null;
  } catch {
    return null;
  }
}

export const lireCibles = async () => (await lireData<{ activeTargets: CibleBrute[] }>("/api/v1/targets"))?.activeTargets ?? null;
export const lireRegles = async () => (await lireData<{ groups: { rules: unknown[] }[] }>("/api/v1/rules"))?.groups ?? null;
export const lireTsdb = async () => (await lireData<{ headStats: { numSeries: number; minTime: number; maxTime: number } }>("/api/v1/status/tsdb"))?.headStats ?? null;
export const lireRuntime = () => lireData<{ startTime: string; storageRetention: string; reloadConfigSuccess: boolean }>("/api/v1/status/runtimeinfo");
export const lireVersion = async () => (await lireData<{ version: string }>("/api/v1/status/buildinfo"))?.version ?? null;

/** Dernière heure, un point toutes les 5 minutes. */
export function plage(q: string) {
  const fin = Math.floor(Date.now() / 1000);
  return lire<SerieBrute[]>("/api/v1/query_range", { query: q, start: String(fin - 3600), end: String(fin), step: "300" });
}
