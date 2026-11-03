import { NextResponse } from "next/server";
import { getSourceStatuses } from "@/lib/sources/registry";
import { HEALTH_CHECKS } from "@/lib/data/ops";
import { unknown } from "@/lib/sources/types";

/** Tant que S4–S7 ne sont pas branchés, chaque indicateur est explicitement inconnu. */
export async function GET() {
  const sources = await getSourceStatuses();
  const health = HEALTH_CHECKS.map((h) => ({ name: h.name, ...unknown<"up" | "down">(h.source) }));
  return NextResponse.json({
    data: { health, lastBackup: unknown("S6 · journal de sauvegarde"), lastDeployment: unknown("S1 · GitHub releases"), openIncidents: unknown("S8 · admin.incidents") },
    sources_connected: sources.filter((s) => s.connected).length,
    fetched_at: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
