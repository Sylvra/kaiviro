import { getInfra } from "@/lib/sources/infra";

/** GET /infra/snapshot — Pi, conteneurs, moniteurs et sauvegarde en un appel (rafraîchissement du panneau Raspberry). */
export async function GET() {
  return Response.json(await getInfra(), { headers: { "Cache-Control": "no-store" } });
}
