import { Agency } from "@/components/agency/Agency";
import { buildAgency } from "@/lib/agency";
import { PEOPLE } from "@/lib/data/plan";
import { dueState } from "@/lib/partners";
import { todayInParis } from "@/lib/plan-day";
import { getActivityLog, getAdrs, getBranchActivity, getDecisions, getDeliverables, getCiRuns, getOpenPullCount, getPartners, getPlanDay } from "@/lib/queries";
import { readAudit } from "@/lib/api/audit";
import { getSourceStatuses } from "@/lib/sources/registry";
import { getInfra } from "@/lib/sources/infra";
import { hostHealth } from "@/lib/infra";

export const metadata = { title: "Agence 3D" };
export const dynamic = "force-dynamic";

/** Agence virtuelle 3D (CC-M4 avancé à la demande de Johan) : mêmes données que la 2D, rien d'inventé. */
export default async function Page() {
  const [deliv, decisions, adrs, partners, activity, pulls, planDay, rawSources, log, infra, ci, audit] = await Promise.all([
    getDeliverables(), getDecisions(), getAdrs(), getPartners(), getBranchActivity(PEOPLE.map((p) => p.branch)),
    getOpenPullCount(), getPlanDay(), getSourceStatuses(), getActivityLog(), getInfra(), getCiRuns(), readAudit(1000),
  ]);
  // S4–S6 sont « connectées » seulement si elles viennent de répondre.
  const answered = { S4: infra.monitors.freshness === "live", S5: infra.host.freshness === "live", S6: infra.backup.freshness === "live", S7: infra.app.freshness === "live" } as Record<string, boolean>;
  const sources = rawSources.map((s) => (s.id in answered ? { ...s, connected: answered[s.id]! } : s));
  const h = infra.host.value;
  const today = todayInParis();
  const model = buildAgency({
    deliverables: deliv.value ?? [],
    decisions: decisions.value ?? [],
    adrs: adrs.value ?? [],
    // Données minimisées pour la scène : référence, nom d'organisation, étape, relance.
    partners: partners.value?.map((p) => ({ ref: p.ref, name: p.name, stage: p.stage, overdue: dueState(p.due, today) === "overdue", dueToday: dueState(p.due, today) === "today" })) ?? null,
    branches: activity.value ? [...new Set(PEOPLE.map((p) => p.branch))].map((b) => {
      const a = activity.value![b];
      return { branch: b, exists: a?.exists ?? false, aheadBy: a?.aheadBy ?? null, pull: a?.pull?.number ?? null };
    }) : null,
    openPulls: pulls.value,
    planDay: planDay.value,
    sources,
    deliverablesLive: deliv.freshness === "live",
    decisionsLive: decisions.freshness === "live",
    piHealth: h ? hostHealth(h) : undefined,
    pi: {
      units: infra.services.value,
      monitors: infra.monitors.value ? { up: infra.monitors.value.filter((m) => m.up).length, total: infra.monitors.value.length } : null,
      backup: infra.backup.value ? `${infra.backup.value.result} · ${infra.backup.value.finished_at.slice(0, 10)}` : null,
    },
    ci: ci.value ? { failures: ci.value.filter((r) => r.state === "failure").length, total: ci.value.length } : null,
    audit: audit.lines.length ? { total: audit.lines.length, denied: audit.lines.filter((l) => l.outcome === "denied").length } : null,
    piSummary: h ? `CPU ${h.cpu === null ? "—" : Math.round(h.cpu * 100) + " %"} · ${h.temp === null ? "— °C" : Math.round(h.temp) + " °C"} · ${infra.services.value ? `${infra.services.value.filter((u) => u.state === "active").length}/${infra.services.value.length} service(s)` : "services ?"}` : undefined,
  });
  return <Agency model={model} log={log.value} logSource={log.source} infra={infra} />;
}
