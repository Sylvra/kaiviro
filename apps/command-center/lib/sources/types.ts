/**
 * Règle KAIVIRO : aucune valeur sans provenance.
 * Toute donnée affichée par le Command Center passe par `Sourced<T>`.
 */
export type Freshness =
  /** mesurée récemment par une source branchée */
  | "live"
  /** mesurée, mais plus ancienne que la fréquence attendue */
  | "stale"
  /** aucune mesure : la source n'est pas branchée ou n'a jamais répondu */
  | "unknown"
  /** donnée de référence versionnée dans le dépôt (plan, spécification) */
  | "static";

export interface Sourced<T> {
  value: T | null;
  /** identifiant de source (S1…S9) ou chemin du document de référence */
  source: string;
  /** ISO 8601, null si jamais mesuré */
  fetchedAt: string | null;
  freshness: Freshness;
  /** vrai si la valeur est un exemple de démonstration */
  demo: boolean;
  /** pourquoi la valeur est inconnue (freshness.schema.json) ; déduit du libellé de source si absent */
  unknownReason?: UnknownReason;
}

export type UnknownReason = "never_measured" | "source_disconnected" | "source_error" | "not_applicable" | "not_collected";

export type SourceId = "S1" | "S2" | "S3" | "S4" | "S5" | "S6" | "S7" | "S8" | "S9";
export type Mission = "A" | "B";

export interface SourceStatus {
  id: SourceId;
  name: string;
  feeds: string;
  owner: Mission;
  phase: string;
  configured: boolean;
  connected: boolean;
  /** pourquoi la source n'est pas connectée, en clair */
  reason: string | null;
}

export function unknown<T>(source: string): Sourced<T> {
  return { value: null, source, fetchedAt: null, freshness: "unknown", demo: false };
}

export function fromStatic<T>(value: T, source: string): Sourced<T> {
  return { value, source, fetchedAt: null, freshness: "static", demo: false };
}

export function fromDemo<T>(value: T, source: string): Sourced<T> {
  return { value, source, fetchedAt: null, freshness: "static", demo: true };
}
