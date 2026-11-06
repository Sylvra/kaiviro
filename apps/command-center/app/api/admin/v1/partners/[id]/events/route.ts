import type { NextRequest } from "next/server";
import { problem, sourced } from "@/lib/api/respond";
import { guardWrite } from "@/lib/api/guard";
import { InteractionInput } from "@/lib/partners";
import { addInteraction } from "@/lib/sources/partners-store";

/** Ajoute une interaction (appel, e-mail, rendez-vous, note) à l'historique d'un partenaire. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const refused = guardWrite(req, { github: false });
  if (refused) return refused;
  const parsed = InteractionInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(400, "Interaction invalide", parsed.error.issues.map((i) => i.message).join(" · "));
  const { id } = await params;
  const p = await addInteraction(id, parsed.data);
  if (!p) return problem(404, "Partenaire inconnu");
  return sourced({ value: p, source: "Fichier local · data/partners.json", fetchedAt: new Date().toISOString(), freshness: "live", demo: false }, { status: 201 });
}
