import type { NextRequest } from "next/server";
import { problem } from "@/lib/api/respond";
import { readBackup } from "@/lib/sources/partners-store";

/** Téléchargement d'un instantané (nom vérifié côté stockage : aucun chemin accepté). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const raw = await readBackup(name);
  if (raw === null) return problem(404, "Sauvegarde introuvable");
  return new Response(raw, {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="kaiviro-${name}"`, "Cache-Control": "no-store" },
  });
}
