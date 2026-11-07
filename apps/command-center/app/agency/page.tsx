import { Agency } from "@/components/agency/Agency";
import { buildAgency } from "@/lib/agency";
import { PEOPLE } from "@/lib/data/plan";
import { dueState } from "@/lib/partners";
import { todayInParis } from "@/lib/plan-day";
import { getActivityLog, getAdrs, getBranchActivity, getDecisions, getDeliverables, getOpenPullCount, getPartners, getPlanDay } from "@/lib/queries";
import { getSourceStatuses } from "@/lib/sources/registry";

export const metadata = { title: "Agence 3D" };
export const dynamic = "force-dynamic";

/** Agence virtuelle 3D (CC-M4 avancé à la demande de Johan) : mêmes données que la 2D, rien d'inventé. */
export default async function Page() {
  const [deliv, decisions, adrs, partners, activity, pulls, planDay, sources, log] = await Promise.all([
    getDeliverables(), getDecisions(), getAdrs(), getPartners(), getBranchActivity(PEOPLE.map((p) => p.branch)),
    getOpenPullCount(), getPlanDay(), getSourceStatuses(), getActivityLog(),
  ]);
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
  });
  return <Agency model={model} log={log.value} logSource={log.source} />;
}
