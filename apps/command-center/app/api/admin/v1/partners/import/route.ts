import type { NextRequest } from "next/server";
import { z } from "zod";
import { problem } from "@/lib/api/respond";
import { audited } from "@/lib/api/audit";
import { importPartners } from "@/lib/sources/partners-store";

const Body = z.object({ confirm: z.literal("RESTAURER"), file: z.unknown() });

/**
 * Importe un fichier exporté (ou une sauvegarde) et remplace toutes les fiches.
 * Niveau 3 : confirmation { confirm: "RESTAURER" } et motif ; validé avant écriture, état actuel sauvegardé avant.
 */
export async function POST(req: NextRequest) {
  return audited(req, { action: "partner.import", level: 3, resource: { type: "partners", id: "all" }, github: false }, async (raw) => {
    const parsed = Body.safeParse(raw);
    if (!parsed.success) return problem(409, "Confirmation requise", "Taper RESTAURER pour remplacer les fiches actuelles.");
    const r = await importPartners(parsed.data.file);
    if (!r.ok) return problem(400, "Fichier refusé", r.reason);
    return Response.json({ ok: true, count: r.count }, { headers: { "Cache-Control": "no-store" } });
  });
}
