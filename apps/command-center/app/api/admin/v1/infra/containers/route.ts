import { sourced } from "@/lib/api/respond";
import { getContainers } from "@/lib/sources/infra";

/** Contrat admin : GET /infra/containers — conteneurs vus par cAdvisor (S5). Le redémarrage (N2) attend CC-M3. */
export async function GET() {
  return sourced(await getContainers());
}
