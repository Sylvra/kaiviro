import type { NextRequest } from "next/server";
import { z } from "zod";
import { problem, sourced } from "@/lib/api/respond";
import { guardWrite } from "@/lib/api/guard";
import { PartnerPatch } from "@/lib/partners";
import { deletePartner, readPartners, updatePartner } from "@/lib/sources/partners-store";

/** Modifie un partenaire (champs partiels). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const refused = guardWrite(req, { github: false });
  if (refused) return refused;
  const parsed = PartnerPatch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(400, "Modification invalide", parsed.error.issues.map((i) => i.message).join(" · "));
  const { id } = await params;
  const p = await updatePartner(id, parsed.data);
  if (!p) return problem(404, "Partenaire inconnu");
  return sourced({ value: p, source: "Fichier local · data/partners.json", fetchedAt: new Date().toISOString(), freshness: "live", demo: false });
}

const Confirm = z.object({ confirm: z.string() });

/**
 * Suppression définitive (droit à l'effacement, CRM_SPEC §5.4). Action sensible (N3) :
 * la référence du partenaire doit être retapée dans { confirm }.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const refused = guardWrite(req, { github: false });
  if (refused) return refused;
  const parsed = Confirm.safeParse(await req.json().catch(() => null));
  const { id } = await params;
  const target = (await readPartners()).partners.find((p) => p.id === id);
  if (!target) return problem(404, "Partenaire inconnu");
  if (!parsed.success || parsed.data.confirm.trim() !== target.ref) {
    return problem(409, "Confirmation requise", `Retaper la référence ${target.ref} pour supprimer.`);
  }
  await deletePartner(id);
  return new Response(null, { status: 204 });
}
