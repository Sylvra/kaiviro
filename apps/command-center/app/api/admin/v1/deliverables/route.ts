import type { NextRequest } from "next/server";
import { sourced } from "@/lib/api/respond";
import { getDeliverables } from "@/lib/queries";

export async function GET(req: NextRequest) {
  const mission = req.nextUrl.searchParams.get("mission")?.toUpperCase();
  const d = await getDeliverables();
  const value = mission && d.value ? d.value.filter((x) => x.owner === mission) : d.value;
  return sourced({ ...d, value });
}
