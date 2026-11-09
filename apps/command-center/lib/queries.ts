import "server-only";
import { ADRS, DECISIONS, DELIVERABLES, PLAN_DAY, PLAN_SOURCE, type Adr, type AdrStatus, type Decision, type Deliverable, type Owner, type Status } from "./data/plan";
import { EVENT_LABEL, type Partner } from "./partners";
import { mapRepoEvent, mergeLog, type LogEntry } from "./activity";
import { readPartners } from "./sources/partners-store";
import { compareBranch, getBranchHead, getRepo, listRepoEvents, listAdrFiles, listBranches, listIssues, listOpenPulls, readRaw, type GhComment, type GhIssue } from "./sources/github";
import { fromStatic, type Sourced } from "./sources/types";
import { planDayAt, todayInParis, type PlanDay } from "./plan-day";

/* Convention de labels GitHub proposée (CC-M1_REPORT §5) :
 *   livrable · mission:a | mission:b | mission:commun · status:todo|doing|review|done · type:<x> · jours:3-4
 *   decision · owner:a | owner:b | owner:humains · ref:ADR-0015
 */
const label = (i: GhIssue, prefix: string) => i.labels.map((l) => l.name).find((n) => n.startsWith(prefix))?.slice(prefix.length);

const OWNER_FROM: Record<string, Owner> = { a: "A", b: "B", commun: "C", humains: "H" };
const STATUS_FROM: Record<string, Status> = { todo: 0, doing: 1, review: 2, done: 3 };
export const STATUS_TO = ["todo", "doing", "review", "done"] as const;

/** Nouveaux labels et état d'une issue livrable pour un statut donné : un seul label status:*, fermée si Terminé. */
export function statusPatch(labels: string[], status: Status): { labels: string[]; state: "open" | "closed" } {
  return {
    labels: [...labels.filter((n) => !n.startsWith("status:")), `status:${STATUS_TO[status]}`],
    state: status === 3 ? "closed" : "open",
  };
}

/** Issue GitHub d'un nouveau livrable, au format de la convention (statut À faire). */
export function newDeliverableIssue(d: { title: string; mission: "commun" | "a" | "b"; kind: string; days: [number, number]; path?: string }) {
  const lines = [d.path ? `Chemin : \`${d.path.replace(/`/g, "")}\`` : null, "Créé depuis le Command Center."].filter(Boolean);
  return {
    title: d.title,
    body: lines.join("\n\n"),
    labels: ["livrable", `mission:${d.mission}`, "status:todo", `type:${d.kind}`, `jours:${d.days[0]}-${d.days[1]}`],
  };
}

export interface DeliverableEdit {
  title?: string;
  mission?: "commun" | "a" | "b";
  kind?: string;
  days?: [number, number];
  /** chaîne vide : retire la ligne « Chemin : » */
  path?: string;
}

/** Remplace la ligne « Chemin : » du corps (ou l'ajoute en tête, ou la retire si path est vide). */
export function withPath(body: string | null, path: string): string {
  const b = body ?? "";
  const line = path.trim() ? `Chemin : \`${path.trim().replace(/`/g, "")}\`` : "";
  if (/^Chemin\s*:.*$/m.test(b)) return b.replace(/^Chemin\s*:.*$/m, line).replace(/^\n+/, "").replace(/\n{3,}/g, "\n\n").trim();
  return line ? `${line}${b.trim() ? `\n\n${b.trim()}` : ""}` : b;
}

/** Patch GitHub d'une modification de livrable : titre, labels mission/type/jours, ligne Chemin. Statut inchangé. */
export function editPatch(issue: { title: string; body: string | null; labels: string[] }, e: DeliverableEdit) {
  const replace = (labels: string[], prefix: string, value: string | undefined) =>
    value === undefined ? labels : [...labels.filter((n) => !n.startsWith(prefix)), `${prefix}${value}`];
  let labels = issue.labels;
  labels = replace(labels, "mission:", e.mission);
  labels = replace(labels, "type:", e.kind?.trim());
  labels = replace(labels, "jours:", e.days ? `${e.days[0]}-${e.days[1]}` : undefined);
  return {
    ...(e.title !== undefined && e.title.trim() !== issue.title ? { title: e.title.trim() } : {}),
    ...(e.path !== undefined ? { body: withPath(issue.body, e.path) } : {}),
    labels,
  };
}

export interface IssueComment { id: number; author: string; body: string; at: string; url: string }

export function toComment(c: GhComment): IssueComment {
  return { id: c.id, author: c.user?.login ?? "inconnu", body: c.body ?? "", at: c.created_at, url: c.html_url };
}

/** Corps d'une issue livrable sans la ligne « Chemin : » déjà affichée à part. */
export function deliverableNotes(body: string | null): string {
  return (body ?? "").replace(/^Chemin\s*:.*$/m, "").replace(/\n{3,}/g, "\n\n").trim();
}

/** Commentaire écrit sur l'issue d'une décision, ou null s'il n'y a rien à écrire. */
export function decisionComment(action: "comment" | "resolve" | "reopen", option?: string, note?: string): string | null {
  if (action === "comment") return note ? note : null;
  if (action === "reopen") return note ? `Rouverte depuis le Command Center.\n\n${note}` : "Rouverte depuis le Command Center.";
  const parts = [option ? `**Tranchée : ${option}**` : "**Tranchée.**", note, "L’ADR liée est à mettre à jour dans une PR."];
  return parts.filter(Boolean).join("\n\n");
}

/* Corps d'une issue livrable : ligne « Chemin : `docs/...` ».
 * Corps d'une issue décision : résumé, contexte, puis une section « ## Options » en liste. */
const bodyPath = (body: string | null) => body?.match(/^Chemin\s*:\s*`?([^`\n]+)`?/m)?.[1]?.trim();

export function splitDecisionBody(body: string | null): { summary: string; context: string; options: string[] } {
  const [main = "", opts = ""] = (body ?? "").split(/^##\s*Options\s*$/m);
  const paragraphs = main.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return {
    summary: (paragraphs[0] ?? "").slice(0, 140),
    context: paragraphs.slice(1).join("\n\n") || (paragraphs[0] ?? ""),
    options: opts.split("\n").map((l) => l.match(/^\s*[-*]\s+(.+)$/)?.[1]?.trim()).filter((o): o is string => Boolean(o)),
  };
}

export function issueToDeliverable(i: GhIssue): Deliverable {
  const days = (label(i, "jours:") ?? "").split("-").map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n));
  const status = i.state === "closed" ? 3 : STATUS_FROM[label(i, "status:") ?? "todo"] ?? 0;
  return {
    id: `gh-${i.number}`,
    owner: OWNER_FROM[label(i, "mission:") ?? "commun"] ?? "C",
    title: i.title,
    path: bodyPath(i.body) ?? `#${i.number}`,
    days: [days[0] ?? 1, days[1] ?? days[0] ?? 1],
    kind: label(i, "type:") ?? "Tâche",
    status: status as Status,
    url: i.html_url,
  };
}

export async function getDeliverables(): Promise<Sourced<Deliverable[]>> {
  const r = await listIssues("livrable");
  if (r && r.issues.length > 0) {
    return { value: r.issues.map(issueToDeliverable), source: "S1 · GitHub issues « livrable »", fetchedAt: r.fetchedAt, freshness: "live", demo: false };
  }
  return fromStatic(DELIVERABLES, PLAN_SOURCE);
}

export async function getDecisions(): Promise<Sourced<Decision[]>> {
  const r = await listIssues("decision");
  if (r && r.issues.length > 0) {
    const value = r.issues.map<Decision>((i) => ({
      key: `gh-${i.number}`, title: i.title, ref: label(i, "ref:") ?? `#${i.number}`,
      owner: OWNER_FROM[label(i, "owner:") ?? "humains"] ?? "H",
      ...splitDecisionBody(i.body), resolved: i.state === "closed", url: i.html_url,
    }));
    return { value, source: "S1 · GitHub issues « decision »", fetchedAt: r.fetchedAt, freshness: "live", demo: false };
  }
  return fromStatic(DECISIONS, "docs/command-center/CRM_SPEC.md §5.5");
}

export function parseAdrStatus(markdown: string): AdrStatus {
  const m = markdown.match(/^\s*Statut\s*:\s*([A-Z]+)/im);
  const s = (m?.[1] ?? "").toUpperCase();
  return (["PROPOSED", "ACCEPTED", "REJECTED", "SUPERSEDED"] as const).find((x) => s.startsWith(x)) ?? "PROPOSED";
}

export async function getAdrs(): Promise<Sourced<Adr[]>> {
  const r = await listAdrFiles();
  if (r) {
    const files = r.data.filter((f) => f.type === "file" && /^ADR-\d{4}/.test(f.name));
    const found = new Map<string, { status: AdrStatus; url?: string }>();
    await Promise.all(files.map(async (f) => {
      const id = f.name.slice(0, 8);
      const text = f.download_url ? await readRaw(f.download_url) : null;
      found.set(id, { status: text ? parseAdrStatus(text) : "PROPOSED", url: f.download_url ?? undefined });
    }));
    const value = ADRS.map((a) => {
      const f = found.get(a.id);
      if (f) return { ...a, status: f.status, url: f.url };
      return { ...a, status: (a.id === "ADR-0013" ? "OPEN" : "NOT_WRITTEN") as AdrStatus };
    });
    return { value, source: "S2 · docs/adr (develop)", fetchedAt: r.fetchedAt, freshness: "live", demo: false };
  }
  return fromStatic(ADRS.map((a) => (a.id === "ADR-0013" ? { ...a, status: "OPEN" as AdrStatus } : a)), `${PLAN_SOURCE} §3`);
}

export const KNOWN_BRANCHES = [
  { name: "main", role: "releases validées" },
  { name: "develop", role: "intégration" },
  { name: "feature/m0-admin-operations", role: "Mission A" },
  { name: "feature/m0-app-stack", role: "Mission B" },
  { name: "feature/cc-m1-command-center", role: "Command Center" },
];

export async function getBranches(): Promise<Sourced<{ name: string; role: string; protected: boolean | null }[]>> {
  const r = await listBranches();
  if (r) {
    const value = r.data.map((b) => ({ name: b.name, role: KNOWN_BRANCHES.find((k) => k.name === b.name)?.role ?? "", protected: b.protected }));
    return { value, source: "S1 · GitHub branches", fetchedAt: r.fetchedAt, freshness: "live", demo: false };
  }
  return fromStatic(KNOWN_BRANCHES.map((b) => ({ ...b, protected: null })), `${PLAN_SOURCE} §2`);
}

export interface BranchActivity {
  branch: string;
  exists: boolean;
  /** commits d'avance sur develop ; null si inconnu */
  aheadBy: number | null;
  lastCommit: { message: string; date: string; url: string } | null;
  pull: { number: number; url: string; draft: boolean } | null;
}

/** Activité réelle des branches de mission (S1) : existence, dernier commit, avance sur develop, PR ouverte. */
export async function getBranchActivity(branches: string[]): Promise<Sourced<Record<string, BranchActivity>>> {
  const [list, pulls] = await Promise.all([listBranches(), listOpenPulls()]);
  if (!list) return { value: null, source: "S1 · GitHub branches et commits", fetchedAt: null, freshness: "unknown", demo: false };
  const names = new Set(list.data.map((b) => b.name));
  const entries = await Promise.all([...new Set(branches)].map(async (branch): Promise<[string, BranchActivity]> => {
    const pr = pulls?.data.find((p) => p.head.ref === branch);
    const pull = pr ? { number: pr.number, url: pr.html_url, draft: pr.draft } : null;
    if (!names.has(branch)) return [branch, { branch, exists: false, aheadBy: null, lastCommit: null, pull }];
    const [head, cmp] = await Promise.all([getBranchHead(branch), compareBranch("develop", branch)]);
    const lastCommit = head ? { message: head.data.commit.message.split("\n")[0] ?? "", date: head.data.commit.author?.date ?? "", url: head.data.html_url } : null;
    return [branch, { branch, exists: true, aheadBy: cmp?.data.ahead_by ?? null, lastCommit, pull }];
  }));
  return { value: Object.fromEntries(entries), source: "S1 · GitHub branches et commits", fetchedAt: list.fetchedAt, freshness: "live", demo: false };
}

export type AgentState = "unknown" | "not-started" | "empty" | "working" | "pr-open";

/** État d'un agent déduit de sa branche : aucune présence n'est inventée. */
export function agentState(a: BranchActivity | undefined | null): AgentState {
  if (!a) return "unknown";
  if (!a.exists) return a.pull ? "pr-open" : "not-started";
  if (a.pull) return "pr-open";
  if (a.aheadBy === 0) return "empty";
  if (a.aheadBy === null) return "unknown";
  return "working";
}

/** Journal : flux GitHub du dépôt + historique des partenaires (référence et nom d'organisation seulement). */
export async function getActivityLog(): Promise<Sourced<LogEntry[]>> {
  const [events, partners] = await Promise.all([listRepoEvents(), readPartners().catch(() => null)]);
  const gh = (events?.data ?? []).map(mapRepoEvent).filter((e): e is LogEntry => e !== null);
  const local: LogEntry[] = (partners?.partners ?? []).flatMap((p) => (p.events ?? []).map((e) => ({
    id: `p-${e.id}`, at: e.at, source: "Partenaires" as const, kind: EVENT_LABEL[e.kind], actor: p.owner, text: `${p.ref} ${p.name} · ${e.text}`,
  })));
  if (!events && !partners) return { value: null, source: "S1 · GitHub events + fichier local", fetchedAt: null, freshness: "unknown", demo: false };
  return {
    value: mergeLog([gh, local]),
    source: events ? "S1 · GitHub events + fichier local" : "Fichier local (GitHub injoignable)",
    fetchedAt: events?.fetchedAt ?? new Date().toISOString(), freshness: events ? "live" : "stale", demo: false,
  };
}

export async function getOpenPullCount(): Promise<Sourced<number>> {
  const r = await listOpenPulls();
  if (r) return { value: r.data.length, source: "S1 · GitHub pulls", fetchedAt: r.fetchedAt, freshness: "live", demo: false };
  return { value: null, source: "S1 · GitHub pulls", fetchedAt: null, freshness: "unknown", demo: false };
}

/**
 * Jour du plan M0. Début : PLAN_START (.env.local, AAAA-MM-JJ) s'il est renseigné,
 * sinon la date de création du dépôt GitHub (le plan place la création du dépôt en J1).
 */
export async function getPlanDay(): Promise<Sourced<PlanDay>> {
  const today = todayInParis();
  const env = process.env.PLAN_START?.trim();
  const fromEnv = env ? planDayAt(env, today, PLAN_DAY.total) : null;
  if (fromEnv) return fromStatic(fromEnv, ".env.local · PLAN_START");
  const repo = await getRepo();
  const created = repo?.data.created_at ? todayInParis(new Date(repo.data.created_at)) : null;
  const fromRepo = created ? planDayAt(created, today, PLAN_DAY.total) : null;
  if (fromRepo && repo) return { value: fromRepo, source: "S1 · date de création du dépôt", fetchedAt: repo.fetchedAt, freshness: "live", demo: false };
  return { value: null, source: "PLAN_START ou S1", fetchedAt: null, freshness: "unknown", demo: false };
}

/** Partenaires : fichier local ignoré par Git (choix de Johan, 2026-11-06), en attendant S8 (Supabase). */
export async function getPartners(): Promise<Sourced<Partner[]>> {
  try {
    const { partners } = await readPartners();
    return { value: partners, source: "S8 · fichier local data/partners.json, en attendant Supabase", fetchedAt: new Date().toISOString(), freshness: "live", demo: false };
  } catch {
    return { value: null, source: "S8 · fichier local data/partners.json, en attendant Supabase (illisible)", fetchedAt: null, freshness: "unknown", demo: false };
  }
}
