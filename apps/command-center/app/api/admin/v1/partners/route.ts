import type { NextRequest } from "next/server";
import { problem, sourced } from "@/lib/api/respond";
import { guardWrite } from "@/lib/api/guard";
import { getPartners } from "@/lib/queries";
import { PartnerInput } from "@/lib/partners";
import { createPartner } from "@/lib/sources/partners-store";

export async function GET() {
  return sourced(await getPartners());
}

/** Crée un partenaire dans le fichier local. Garde : JSON et même hôte (pas besoin de GitHub). */
export async function POST(req: NextRequest) {
  const refused = guardWrite(req, { github: false });
  if (refused) return refused;
  const parsed = PartnerInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(400, "Partenaire invalide", parsed.error.issues.map((i) => i.message).join(" · "));
  const p = await createPartner(parsed.data);
  return sourced({ value: p, source: "Fichier local · data/partners.json", fetchedAt: new Date().toISOString(), freshness: "live", demo: false }, { status: 201 });
}
