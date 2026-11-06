import type { NextRequest } from "next/server";
import { z } from "zod";
import { problem } from "@/lib/api/respond";
import { guardWrite } from "@/lib/api/guard";
import { importPartners } from "@/lib/sources/partners-store";

const Body = z.object({ confirm: z.literal("RESTAURER"), file: z.unknown() });

/**
 * Importe un fichier exporté (ou une sauvegarde) et remplace toutes les fiches.
 * Validé avant écriture ; l'état actuel est sauvegardé avant. Confirmation { confirm: "RESTAURER" }.
 */
export async function POST(req: NextRequest) {
  const refused = guardWrite(req, { github: false });
  if (refused) return refused;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(409, "Confirmation requise", "Taper RESTAURER pour remplacer les fiches actuelles.");
  const r = await importPartners(parsed.data.file);
  if (!r.ok) return problem(400, "Fichier refusé", r.reason);
  return Response.json({ ok: true, count: r.count }, { headers: { "Cache-Control": "no-store" } });
}
