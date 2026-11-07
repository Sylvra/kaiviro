import "server-only";
import { NextResponse } from "next/server";
import type { Sourced } from "@/lib/sources/types";

/** Toute réponse de l'API d'administration porte sa provenance (CRM_SPEC §8). */
export function sourced<T>(s: Sourced<T>, init?: ResponseInit) {
  return NextResponse.json(
    { data: s.value, source: s.source, fetched_at: s.fetchedAt, freshness: s.freshness, demo: s.demo },
    { ...init, headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) } },
  );
}

export function problem(status: number, title: string, detail?: string) {
  return NextResponse.json({ type: "about:blank", title, status, detail }, { status, headers: { "Cache-Control": "no-store" } });
}
