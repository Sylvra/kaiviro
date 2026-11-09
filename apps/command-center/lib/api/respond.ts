import "server-only";
import { NextResponse } from "next/server";
import type { Sourced } from "@/lib/sources/types";
import { envelope } from "@/lib/contract";

/**
 * Toute réponse de l'API d'administration porte sa provenance (CRM_SPEC §8),
 * au format de packages/schemas/ops/freshness.schema.json : source, source_label, unknown_reason.
 */
export function sourced<T>(s: Sourced<T>, init?: ResponseInit) {
  return NextResponse.json(envelope(s), { ...init, headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) } });
}

/** Variante qui convertit la valeur au format du contrat avant l'envoi. */
export function sourcedAs<T, U>(s: Sourced<T>, map: (v: T) => U, init?: ResponseInit) {
  return sourced<U>({ ...s, value: s.value === null ? null : map(s.value) }, init);
}

export function problem(status: number, title: string, detail?: string) {
  return NextResponse.json({ type: "about:blank", title, status, detail }, { status, headers: { "Cache-Control": "no-store" } });
}
