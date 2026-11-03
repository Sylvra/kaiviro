import type { Freshness, Sourced } from "./types";

/**
 * Calcule la fraîcheur d'une mesure.
 * - pas d'horodatage → "unknown" (jamais "live" par défaut)
 * - horodatage invalide ou dans le futur → "unknown"
 * - âge ≤ maxAgeMs → "live", sinon "stale"
 */
export function computeFreshness(fetchedAt: string | null, maxAgeMs: number, now: Date = new Date()): Freshness {
  if (!fetchedAt) return "unknown";
  const t = Date.parse(fetchedAt);
  if (Number.isNaN(t)) return "unknown";
  const age = now.getTime() - t;
  if (age < -60_000) return "unknown";
  return age <= maxAgeMs ? "live" : "stale";
}

/** Libellé humain de l'âge d'une mesure, en français. */
export function ageLabel(fetchedAt: string | null, now: Date = new Date()): string {
  if (!fetchedAt) return "jamais mesuré";
  const t = Date.parse(fetchedAt);
  if (Number.isNaN(t)) return "horodatage invalide";
  const s = Math.max(0, Math.round((now.getTime() - t) / 1000));
  if (s < 60) return `il y a ${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

/** Une valeur ne peut être présentée comme saine que si elle est mesurée et fraîche. */
export function isTrustworthy(s: Sourced<unknown>): boolean {
  return s.value !== null && s.freshness === "live" && !s.demo && s.source.length > 0;
}
