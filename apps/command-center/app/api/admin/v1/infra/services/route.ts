import { sourced } from "@/lib/api/respond";
import { getServices } from "@/lib/sources/infra";

/** GET /infra/services — services systemd suivis sur la Pi (S5, Node Exporter --collector.systemd). */
export async function GET() {
  return sourced(await getServices());
}
