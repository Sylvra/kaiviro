import type { NextRequest } from "next/server";
import { problem } from "@/lib/api/respond";
import { readPartners } from "@/lib/sources/partners-store";

/**
 * Export JSON (droit d'accès et de portabilité, CRM_SPEC §5.4) : un partenaire avec ?id=…, sinon tous.
 * Téléchargement en pièce jointe, jamais mis en cache.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const { partners } = await readPartners();
  const data = id ? partners.filter((p) => p.id === id) : partners;
  if (id && data.length === 0) return problem(404, "Partenaire inconnu");
  const name = id ? `kaiviro-partenaire-${data[0]!.ref}.json` : `kaiviro-partenaires-${new Date().toISOString().slice(0, 10)}.json`;
  return new Response(JSON.stringify({ exported_at: new Date().toISOString(), partners: data }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
