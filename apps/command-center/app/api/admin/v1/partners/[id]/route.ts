import type { NextRequest } from "next/server";
import { z } from "zod";
import { problem, sourced } from "@/lib/api/respond";
import { audited } from "@/lib/api/audit";
import { PartnerPatch, partnerBodyFromApi, partnerToApi } from "@/lib/partners";
import { deletePartner, readPartners, updatePartner } from "@/lib/sources/partners-store";

/** Modifie un partenaire (champs partiels, noms du contrat). Niveau 2 : garde, motif et audit. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return audited(req, { action: "partner.update", level: 2, resource: { type: "partner", id }, github: false }, async (raw) => {
    const parsed = PartnerPatch.safeParse(partnerBodyFromApi(raw));
    if (!parsed.success) return problem(400, "Modification invalide", parsed.error.issues.map((i) => i.message).join(" · "));
    const p = await updatePartner(id, parsed.data);
    if (!p) return problem(404, "Partenaire inconnu");
    return sourced({ value: partnerToApi(p), source: "S8 · fichier local data/partners.json, en attendant Supabase", fetchedAt: new Date().toISOString(), freshness: "live", demo: false });
  });
}

const Confirm = z.object({ confirm: z.string() });

/**
 * Suppression définitive (droit à l'effacement, CRM_SPEC §5.4). Niveau 3 :
 * la référence du partenaire doit être retapée dans { confirm }, avec un motif ; journalisé.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return audited(req, { action: "partner.delete", level: 3, resource: { type: "partner", id }, github: false }, async (raw) => {
    const parsed = Confirm.safeParse(raw);
    const target = (await readPartners()).partners.find((p) => p.id === id);
    if (!target) return problem(404, "Partenaire inconnu");
    if (!parsed.success || parsed.data.confirm.trim() !== target.ref) {
      return problem(409, "Confirmation requise", `Retaper la référence ${target.ref} pour supprimer.`);
    }
    await deletePartner(id);
    return new Response(null, { status: 204 });
  });
}
