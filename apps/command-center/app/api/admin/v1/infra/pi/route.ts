import { sourced } from "@/lib/api/respond";
import { getPiHost } from "@/lib/sources/infra";

/** Contrat admin : GET /infra/pi — CPU, RAM, température, disque, uptime (S5). */
export async function GET() {
  return sourced(await getPiHost());
}
