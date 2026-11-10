/**
 * Exécutions GitHub Actions (S1) et journal d'audit local : fonctions pures, testables sans réseau ni disque.
 */
export type RunState = "success" | "failure" | "running" | "cancelled" | "other";

export interface CiRun {
  id: number;
  workflow: string;
  branch: string;
  event: string;
  state: RunState;
  startedAt: string;
  url: string;
}

interface GhRun {
  id: number; name?: string | null; head_branch?: string | null; event?: string; status?: string | null;
  conclusion?: string | null; run_started_at?: string | null; created_at: string; html_url: string;
}

export function runState(status: string | null | undefined, conclusion: string | null | undefined): RunState {
  if (status && status !== "completed") return "running";
  if (conclusion === "success") return "success";
  if (conclusion === "failure" || conclusion === "timed_out" || conclusion === "startup_failure") return "failure";
  if (conclusion === "cancelled") return "cancelled";
  return "other";
}

export function mapRuns(json: unknown): CiRun[] {
  const runs = (json as { workflow_runs?: GhRun[] })?.workflow_runs;
  if (!Array.isArray(runs)) return [];
  return runs.map((r) => ({
    id: r.id,
    workflow: r.name ?? "workflow",
    branch: r.head_branch ?? "—",
    event: r.event ?? "—",
    state: runState(r.status, r.conclusion),
    startedAt: r.run_started_at ?? r.created_at,
    url: r.html_url,
  }));
}

/** Dernière exécution par workflow et par branche : l'état « vert / rouge » qu'on veut voir d'un coup d'œil. */
export function latestByWorkflow(runs: CiRun[]): CiRun[] {
  const seen = new Map<string, CiRun>();
  for (const r of runs) {
    const k = `${r.workflow}|${r.branch}`;
    if (!seen.has(k)) seen.set(k, r);
  }
  return [...seen.values()];
}

export interface AuditLine {
  id: string;
  at: string;
  action: string;
  level: number;
  resource: string;
  outcome: string;
  reason: string | null;
}

/** Lit un fichier JSON Lines d'audit : lignes illisibles ignorées et comptées, plus récentes d'abord. */
export function parseAuditLines(text: string, limit = 200): { lines: AuditLine[]; skipped: number } {
  let skipped = 0;
  const lines: AuditLine[] = [];
  for (const raw of text.split("\n")) {
    if (!raw.trim()) continue;
    try {
      const e = JSON.parse(raw) as Record<string, unknown>;
      const res = e.resource as { type?: string; id?: string } | undefined;
      if (typeof e.id !== "string" || typeof e.at !== "string" || typeof e.action !== "string") throw new Error("champs");
      lines.push({
        id: e.id, at: e.at, action: e.action, level: Number(e.level) || 0,
        resource: res ? `${res.type ?? "?"}:${res.id ?? "?"}` : "—",
        outcome: typeof e.outcome === "string" ? e.outcome : "?",
        reason: typeof e.reason === "string" ? e.reason : null,
      });
    } catch {
      skipped++;
    }
  }
  lines.sort((a, b) => b.at.localeCompare(a.at));
  return { lines: lines.slice(0, limit), skipped };
}
