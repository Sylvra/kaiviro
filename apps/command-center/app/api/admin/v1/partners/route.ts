import type { NextRequest } from "next/server";
import { problem, sourced, sourcedAs } from "@/lib/api/respond";
import { audited } from "@/lib/api/audit";
import { getPartners } from "@/lib/queries";
import { PartnerInput, partnerBodyFromApi, partnerToApi } from "@/lib/partners";
import { createPartner } from "@/lib/sources/partners-store";

/** Partenaires au format du contrat (OpenAPI, schéma Partner). */
export async function GET() {
  return sourcedAs(await getPartners(), (list) => list.map(partnerToApi));
}

/** Crée un partenaire dans le fichier local. Niveau 2 : garde (sans GitHub), motif et audit. */
export async function POST(req: NextRequest) {
  return audited(req, { action: "partner.create", level: 2, resource: { type: "partner", id: "new" }, github: false }, async (raw) => {
    const parsed = PartnerInput.safeParse(partnerBodyFromApi(raw));
    if (!parsed.success) return problem(400, "Partenaire invalide", parsed.error.issues.map((i) => i.message).join(" · "));
    const p = await createPartner(parsed.data);
    return sourced({ value: partnerToApi(p), source: "S8 · fichier local data/partners.json, en attendant Supabase", fetchedAt: new Date().toISOString(), freshness: "live", demo: false }, { status: 201 });
  });
}
