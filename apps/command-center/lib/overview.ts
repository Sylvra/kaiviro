import type { Deliverable } from "@/lib/data/plan";
import { MILESTONES } from "@/lib/data/plan";

/**
 * Lecture du plan pour la vue d'ensemble, à partir du jour réel (getPlanDay) et des statuts GitHub.
 * « En retard » : fenêtre du plan terminée, livrable pas encore terminé (En revue compris).
 */
export interface PlanSlice {
  today: Deliverable[];
  late: Deliverable[];
  next: Deliverable[];
  milestone: { label: string; days: [number, number]; inDays: number } | null;
}

export function planSlice(items: Deliverable[], current: number | null): PlanSlice {
  if (!current) return { today: [], late: [], next: [], milestone: null };
  const open = items.filter((d) => d.status !== 3);
  const today = open.filter((d) => d.days[0] <= current && current <= d.days[1]);
  const late = open.filter((d) => d.days[1] < current).sort((a, b) => a.days[1] - b.days[1]);
  const nextStart = Math.min(...open.filter((d) => d.days[0] > current).map((d) => d.days[0]));
  const next = Number.isFinite(nextStart) ? open.filter((d) => d.days[0] === nextStart) : [];
  const m = MILESTONES.find((x) => x.days[1] >= current);
  return { today, late, next, milestone: m ? { label: m.label, days: m.days, inDays: Math.max(0, m.days[0] - current) } : null };
}

export function countByStatus(items: Deliverable[]): [number, number, number, number] {
  const c: [number, number, number, number] = [0, 0, 0, 0];
  items.forEach((d) => { c[d.status]++; });
  return c;
}
