import { sourced } from "@/lib/api/respond";
import { getMonitors } from "@/lib/sources/infra";

/** GET /infra/uptime — moniteurs Uptime Kuma (S4). */
export async function GET() {
  return sourced(await getMonitors());
}
