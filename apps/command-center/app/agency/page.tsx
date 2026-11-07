import { Agency } from "@/components/agency/Agency";
import { buildAgency } from "@/lib/agency";
import { PEOPLE } from "@/lib/data/plan";
import { dueState } from "@/lib/partners";
import { todayInParis } from "@/lib/plan-day";
import { getActivityLog, getAdrs, getBranchActivity, getDecisions, getDeliverables, getOpenPullCount, getPartners, getPlanDay } from "@/lib/queries";
import { getSourceStatuses } from "@/lib/sources/registry";
import { getInfra } from "@/lib/sources/infra";
import { hostHealth } from "@/lib/infra";

export const metadata = { title: "Agence 3D" };
export const dynamic = "force-dynamic";

/** Agence virtuelle 3D (CC-M4 avancé à la demande de Johan) : mêmes données que la 2D, rien d'inventé. */
export default async function Page() {
  const [deliv, decisions, adrs, partners, activity, pulls, planDay, rawSources, log, infra] = await Promise.all([
    getDeliverables(), getDecisions(), getAdrs(), getPartners(), getBranchActivity(PEOPLE.map((p) => p.branch)),
    getOpenPullCount(), getPlanDay(), getSourceStatuses(), getActivityLog(), getInfra(),
  ]);
  // S4–S6 sont « connectées » seulement si elles viennent de répondre.
  const answered = { S4: infra.monitors.freshness === "live", S5: infra.host.freshness === "live", S6: infra.backup.freshness === "live" } as Record<string, boolean>;
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
    piHealth: h ? hostHealth(h) : undefined,
    piSummary: h ? `CPU ${h.cpu === null ? "—" : Math.round(h.cpu * 100) + " %"} · ${h.temp === null ? "— °C" : Math.round(h.temp) + " °C"} · ${infra.containers.value?.filter((c) => c.up).length ?? "?"} conteneur(s) actif(s)` : undefined,
  });
  return <Agency model={model} log={log.value} logSource={log.source} infra={infra} />;
}
