import { NextResponse } from "next/server";
import { getSourceStatuses } from "@/lib/sources/registry";

export async function GET() {
  const data = await getSourceStatuses();
  return NextResponse.json({ data, source: "registry", fetched_at: new Date().toISOString(), freshness: "live", demo: false }, { headers: { "Cache-Control": "no-store" } });
}
