import type { Adr, Decision, Deliverable, Status } from "@/lib/data/plan";
import type { PartnerStage } from "@/lib/partners";
import type { SourceStatus } from "@/lib/sources/types";
import { planSlice } from "@/lib/overview";

/**
 * Modèle de l'agence virtuelle 3D (COMMAND_CENTER_3D.md) construit uniquement à partir des données réelles.
 * Un service sans source branchée est « unknown » : jamais affiché comme sain.
 */
export type ZoneState = "ok" | "warn" | "alert" | "unknown";
export type ZoneId = "overview" | "livrables" | "decisions" | "partenaires" | "dev" | "knowledge" | "infra" | "ai" | "auto" | "security";

export interface Zone {
  id: ZoneId;
  label: string;
  state: ZoneState;
  summary: string;
  details: string[];
  href: string;
  source: string;
  /** position sur le plateau, en unités de scène (x, z) */
  at: [number, number];
}

export interface AgencyInput {
  deliverables: Deliverable[];
  decisions: Decision[];
  adrs: Adr[];
  partners: { ref: string; name: string; stage: PartnerStage; overdue: boolean; dueToday: boolean }[] | null;
  branches: { branch: string; exists: boolean; aheadBy: number | null; pull: number | null }[] | null;
  openPulls: number | null;
  planDay: { current: number; total: number; over: boolean; overBy: number } | null;
  sources: SourceStatus[];
}

export interface AgencyModel {
  zones: Zone[];
  towers: { owner: "C" | "A" | "B"; blocks: { id: string; title: string; status: Status; url?: string }[] }[];
  beacons: { key: string; title: string; resolved: boolean }[];
  lanes: { stage: PartnerStage; partners: { ref: string; name: string; alert: boolean }[] }[];
  pillars: { branch: string; height: number; pull: number | null; exists: boolean }[];
  books: { id: string; status: Adr["status"] }[];
  days: { n: number; state: "past" | "today" | "future" }[];
  services: { name: string; connected: boolean }[];
}

const POS: Record<ZoneId, [number, number]> = {
  overview: [0, 0], livrables: [-7, -6], decisions: [0, -7], partenaires: [7, -6],
  dev: [-8, 1], knowledge: [8, 1], infra: [-6, 7.5], ai: [0, 8], auto: [6, 7.5], security: [10, 6],
};

const connected = (sources: SourceStatus[], id: string) => sources.find((s) => s.id === id)?.connected ?? false;

export function buildAgency(d: AgencyInput): AgencyModel {
  const current = d.planDay ? (d.planDay.over ? d.planDay.total + d.planDay.overBy : d.planDay.current) : null;
  const slice = planSlice(d.deliverables, current);
  const done = d.deliverables.filter((x) => x.status === 3).length;
  const openDecisions = d.decisions.filter((x) => !x.resolved);
  const overdue = d.partners?.filter((p) => p.overdue).length ?? 0;
  const today = d.partners?.filter((p) => p.dueToday).length ?? 0;
  const s1 = connected(d.sources, "S1");
  const written = d.adrs.filter((a) => a.status !== "NOT_WRITTEN" && a.status !== "OPEN");

  const zone = (id: ZoneId, label: string, state: ZoneState, summary: string, details: string[], href: string, source: string): Zone =>
    ({ id, label, state, summary, details, href, source, at: POS[id] });

  const zones: Zone[] = [
    zone("overview", "Executive", slice.late.length ? "warn" : d.planDay ? "ok" : "unknown",
      d.planDay ? `J${d.planDay.current} sur ${d.planDay.total} · ${done}/${d.deliverables.length} terminés` : "Jour du plan inconnu",
      [`${slice.late.length} livrable(s) en retard`, `${slice.today.length} prévu(s) aujourd’hui`, slice.milestone ? `Jalon : ${slice.milestone.label}` : "Aucun jalon à venir"],
      "/crm/apercu", "Plan M0 + S1"),
    zone("livrables", "Livrables M0", slice.late.length ? "warn" : "ok",
      `${done}/${d.deliverables.length} terminés · ${slice.late.length} en retard`,
      [`${d.deliverables.filter((x) => x.status === 2).length} en revue`, `${d.deliverables.filter((x) => x.status === 1).length} en cours`, `${d.deliverables.filter((x) => x.status === 0).length} à faire`],
      "/crm/tableau", "S1 · issues « livrable »"),
    zone("decisions", "Décisions", openDecisions.length ? "warn" : "ok",
      `${openDecisions.length} à trancher`, openDecisions.slice(0, 4).map((x) => `${x.title} (${x.ref})`), "/crm/decisions", "S1 · issues « decision »"),
    zone("partenaires", "Partenaires", d.partners === null ? "unknown" : overdue ? "alert" : today ? "warn" : "ok",
      d.partners === null ? "Fichier local illisible" : `${d.partners.length} fiche(s) · ${overdue} relance(s) en retard`,
      d.partners === null ? [] : [`${today} relance(s) aujourd’hui`, `${d.partners.filter((p) => p.stage === 2).length} partenaire(s) actif(s)`],
      "/crm/partenaires", "Fichier local · data/partners.json"),
    zone("dev", "Development Studio", s1 ? "ok" : "unknown",
      s1 ? `${d.openPulls ?? "?"} PR ouverte(s) · ${d.branches?.filter((b) => b.exists).length ?? 0} branche(s) de mission` : "GitHub non connecté",
      (d.branches ?? []).map((b) => `${b.branch} : ${!b.exists ? "pas sur GitHub" : b.pull ? `PR #${b.pull}` : `${b.aheadBy ?? "?"} commit(s) d’avance`}`),
      "/ops/development", "S1 · branches, PR"),
    zone("knowledge", "Knowledge Center", connected(d.sources, "S2") ? "ok" : "unknown",
      `${written.length} ADR écrite(s) sur ${d.adrs.length}`, [`${written.filter((a) => a.status === "ACCEPTED").length} acceptée(s)`, `${written.filter((a) => a.status === "PROPOSED").length} proposée(s)`],
      "/ops/knowledge", "S2 · docs/adr"),
    zone("infra", "Infrastructure · Pi", connected(d.sources, "S5") ? "ok" : "unknown",
      connected(d.sources, "S5") ? "Supervision branchée" : "Pi non supervisée : aucune métrique",
      ["Uptime Kuma (S4), Node Exporter (S5), sauvegardes (S6) : non connectés", "Installation prévue J7–J9 par Johan"], "/ops/infrastructure", "S4 · S5 · S6"),
    zone("ai", "AI Laboratory", "unknown", "Aucune donnée avant M5", ["Indicateurs agrégés seulement, jamais le contenu des conversations"], "/ops/ai", "S7 · contrat de supervision"),
    zone("auto", "Automotive", "unknown", "Essais réels en M2", ["Aucune compatibilité ni règle inventée"], "/ops/automotive", "Mission B"),
    zone("security", "Security & Incidents", "unknown", "Audit et incidents en CC-M3", ["Journal d’audit non branché (S8)"], "/ops/security", "S8 · audit"),
  ];

  return {
    zones,
    towers: (["C", "A", "B"] as const).map((owner) => ({
      owner,
      blocks: d.deliverables.filter((x) => x.owner === owner).sort((a, b) => b.status - a.status || a.days[0] - b.days[0]).map((x) => ({ id: x.id, title: x.title, status: x.status, url: x.url })),
    })),
    beacons: d.decisions.map((x) => ({ key: x.key, title: x.title, resolved: x.resolved })),
    lanes: ([0, 1, 2, 3] as const).map((stage) => ({ stage, partners: (d.partners ?? []).filter((p) => p.stage === stage).map((p) => ({ ref: p.ref, name: p.name, alert: p.overdue })) })),
    pillars: (d.branches ?? []).map((b) => ({ branch: b.branch, exists: b.exists, pull: b.pull, height: b.exists ? Math.min(4, 0.4 + (b.aheadBy ?? 0) * 0.15) : 0.15 })),
    books: d.adrs.map((a) => ({ id: a.id, status: a.status })),
    days: Array.from({ length: d.planDay?.total ?? 10 }, (_, i) => ({
      n: i + 1, state: current === null ? "future" : i + 1 < Math.min(current, d.planDay!.total) ? "past" : i + 1 === Math.min(current, d.planDay!.total) ? "today" : "future",
    })),
    services: ["S4", "S5", "S6", "S7"].map((id) => ({ name: d.sources.find((s) => s.id === id)?.name ?? id, connected: connected(d.sources, id) })),
  };
}
