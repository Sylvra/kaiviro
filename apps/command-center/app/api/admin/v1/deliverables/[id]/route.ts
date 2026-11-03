import type { NextRequest } from "next/server";
import { z } from "zod";
import { problem } from "@/lib/api/respond";

const Body = z.object({ status: z.number().int().min(0).max(3) });

/**
 * Écriture du statut d'un livrable dans GitHub (niveau 2).
 * Désactivée en CC-M1 tant que l'authentification admin (ADR-0012) et le jeton en écriture ne sont pas validés.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(400, "Corps invalide", "Attendu : { status: 0 | 1 | 2 | 3 }");
  if (!/^gh-\d+$/.test(id)) return problem(404, "Livrable inconnu", "Seuls les livrables issus de GitHub peuvent être modifiés.");
  return problem(501, "Écriture non activée", "L’écriture GitHub sera activée après validation de l’authentification admin (ADR-0012).");
}
