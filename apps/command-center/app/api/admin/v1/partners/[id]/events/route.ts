import type { NextRequest } from "next/server";
import { problem, sourced } from "@/lib/api/respond";
import { audited } from "@/lib/api/audit";
import { InteractionInput, partnerToApi } from "@/lib/partners";
import { addInteraction } from "@/lib/sources/partners-store";

/** Ajoute une interaction (appel, e-mail, rendez-vous, note) à l'historique. Niveau 2 : garde, motif et audit. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return audited(req, { action: "partner.add_event", level: 2, resource: { type: "partner", id }, github: false }, async (raw) => {
    const parsed = InteractionInput.safeParse(raw);
    if (!parsed.success) return problem(400, "Interaction invalide", parsed.error.issues.map((i) => i.message).join(" · "));
    const p = await addInteraction(id, parsed.data);
    if (!p) return problem(404, "Partenaire inconnu");
    return sourced({ value: partnerToApi(p), source: "S8 · fichier local data/partners.json, en attendant Supabase", fetchedAt: new Date().toISOString(), freshness: "live", demo: false }, { status: 201 });
  });
}
