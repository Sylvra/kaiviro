import { NextResponse } from "next/server";
import { getSourceStatuses } from "@/lib/sources/registry";
import { getInfra } from "@/lib/sources/infra";
import { getCiRuns } from "@/lib/queries";
import { healthTiles } from "@/lib/health";
import { unknown } from "@/lib/sources/types";

/** Aperçu Opérations : mêmes tuiles que /ops/overview. Une source muette donne « unknown », jamais « ok ». */
export async function GET() {
  const [sources, infra, ci] = await Promise.all([getSourceStatuses(), getInfra(), getCiRuns()]);
  const health = healthTiles({ ...infra, ci }).map((t) => ({ name: t.label, state: t.state, value: t.live ? t.value : null, source: t.source, freshness: t.live ? "live" : "unknown" }));
  return NextResponse.json({
    data: { health, lastBackup: infra.backup, lastDeployment: unknown("S1 · GitHub releases"), openIncidents: unknown("S8 · admin.incidents") },
    sources_connected: sources.filter((s) => s.connected).length,
    fetched_at: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
