import { sourced } from "@/lib/api/respond";
import { getAppHealth } from "@/lib/sources/infra";

/** GET /infra/app — santé du backend et de ses dépendances (S7, /health/details). */
export async function GET() {
  return sourced(await getAppHealth());
}
