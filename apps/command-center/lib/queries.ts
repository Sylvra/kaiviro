import "server-only";
import { ADRS, DECISIONS, DELIVERABLES, PLAN_SOURCE, type Adr, type AdrStatus, type Decision, type Deliverable, type Owner, type Status } from "./data/plan";
import { DEMO_PARTNERS, type Partner } from "./data/demo";
import { listAdrFiles, listBranches, listIssues, listOpenPulls, readRaw, type GhIssue } from "./sources/github";
import { fromDemo, fromStatic, type Sourced } from "./sources/types";

/* Convention de labels GitHub proposée (CC-M1_REPORT §5) :
 *   livrable · mission:a | mission:b | mission:commun · status:todo|doing|review|done · type:<x> · jours:3-4
 *   decision · owner:a | owner:b | owner:humains · ref:ADR-0015
 */
const label = (i: GhIssue, prefix: string) => i.labels.map((l) => l.name).find((n) => n.startsWith(prefix))?.slice(prefix.length);

const OWNER_FROM: Record<string, Owner> = { a: "A", b: "B", commun: "C", humains: "H" };
const STATUS_FROM: Record<string, Status> = { todo: 0, doing: 1, review: 2, done: 3 };

export function issueToDeliverable(i: GhIssue): Deliverable {
  const days = (label(i, "jours:") ?? "").split("-").map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n));
  const status = i.state === "closed" ? 3 : STATUS_FROM[label(i, "status:") ?? "todo"] ?? 0;
  return {
    id: `gh-${i.number}`,
    owner: OWNER_FROM[label(i, "mission:") ?? "commun"] ?? "C",
    title: i.title,
    path: `#${i.number}`,
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
      summary: (i.body ?? "").split("\n").find((l) => l.trim().length > 0)?.slice(0, 140) ?? "",
      context: i.body ?? "", options: [], resolved: i.state === "closed", url: i.html_url,
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

export async function getOpenPullCount(): Promise<Sourced<number>> {
  const r = await listOpenPulls();
  if (r) return { value: r.data.length, source: "S1 · GitHub pulls", fetchedAt: r.fetchedAt, freshness: "live", demo: false };
  return { value: null, source: "S1 · GitHub pulls", fetchedAt: null, freshness: "unknown", demo: false };
}

/** S8 non branché en CC-M1 tant que l'accès Supabase n'est pas validé : démonstration signalée. */
export async function getPartners(): Promise<Sourced<Partner[]>> {
  return fromDemo(DEMO_PARTNERS, "S8 · Supabase admin.partners (non connecté)");
}
