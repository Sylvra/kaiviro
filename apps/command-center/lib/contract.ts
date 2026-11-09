/**
 * Adaptateurs entre le modèle interne du prototype et les contrats M0 :
 * - packages/schemas/ops/freshness.schema.json (enveloppe de provenance) ;
 * - packages/api-contracts/admin/openapi.yaml (livrables).
 * Les partenaires ont leurs adaptateurs dans lib/partners.ts.
 * Fonctions pures : utilisables côté serveur et dans le navigateur.
 */
import type { Deliverable, Owner, Status } from "@/lib/data/plan";
import type { Sourced, UnknownReason } from "@/lib/sources/types";

// ---------- Enveloppe de provenance ----------

/** Code de source du contrat : « S1 »…« S9 », ou « ref:<libellé> » pour une donnée de référence versionnée. */
export function sourceCode(label: string): string {
  const l = label.trim();
  const m = /^(S[1-9])(?![0-9])/.exec(l);
  return m?.[1] ?? `ref:${l}`;
}

/** Raison d'une donnée inconnue : explicite si fournie, sinon déduite du libellé de source. null si la donnée est connue. */
export function unknownReasonOf(s: Pick<Sourced<unknown>, "freshness" | "source" | "unknownReason">): UnknownReason | null {
  if (s.freshness !== "unknown") return null;
  if (s.unknownReason) return s.unknownReason;
  if (/absent|non connect|non configur|non branch/i.test(s.source)) return "source_disconnected";
  if (/injoignable|illisible|erreur|refus/i.test(s.source)) return "source_error";
  return "never_measured";
}

/** Corps JSON d'une réponse de lecture, conforme à freshness.schema.json, avec la donnée dans `data`. */
export function envelope<T>(s: Sourced<T>) {
  return {
    data: s.value,
    source: sourceCode(s.source),
    source_label: s.source,
    fetched_at: s.fetchedAt,
    freshness: s.freshness,
    demo: s.demo,
    unknown_reason: unknownReasonOf(s),
  };
}

// ---------- Livrables ----------

export const STATUS_API = ["todo", "in_progress", "in_review", "done"] as const;
export type ApiStatus = (typeof STATUS_API)[number];
export const statusToApi = (s: Status): ApiStatus => STATUS_API[s];
export const statusFromApi = (s: ApiStatus): Status => STATUS_API.indexOf(s) as Status;

export type ApiMission = "commun" | "a" | "b" | "humains";
const MISSION_API: Record<Owner, ApiMission> = { C: "commun", A: "a", B: "b", H: "humains" };

/** Livrable tel que l'expose l'API (schéma Deliverable de l'OpenAPI). `days` : extension du plan J1–J10. */
export interface ApiDeliverable {
  id: string;
  title: string;
  mission: ApiMission;
  type: string;
  status: ApiStatus;
  path: string | null;
  due_on: string | null;
  assignee: string | null;
  url: string | null;
  days: [number, number];
}

const OWNER_FROM_MISSION: Record<ApiMission, Owner> = { commun: "C", a: "A", b: "B", humains: "H" };

/** Inverse de deliverableToApi, pour les composants qui lisent l'API. */
export function deliverableFromApi(a: ApiDeliverable): Deliverable {
  return { id: a.id, owner: OWNER_FROM_MISSION[a.mission], title: a.title, path: a.path ?? "", days: a.days, kind: a.type, status: statusFromApi(a.status), url: a.url ?? undefined };
}

export function deliverableToApi(d: Deliverable): ApiDeliverable {
  return {
    id: d.id,
    title: d.title,
    mission: MISSION_API[d.owner],
    type: d.kind,
    status: statusToApi(d.status),
    path: d.path || null,
    due_on: null,
    assignee: null,
    url: d.url ?? null,
    days: d.days,
  };
}
