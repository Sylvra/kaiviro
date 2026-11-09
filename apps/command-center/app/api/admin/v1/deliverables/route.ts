import type { NextRequest } from "next/server";
import { z } from "zod";
import { problem, sourced, sourcedAs } from "@/lib/api/respond";
import { writeRefused } from "@/lib/api/guard";
import { audited } from "@/lib/api/audit";
import { deliverableToApi } from "@/lib/contract";
import { getDeliverables, issueToDeliverable, newDeliverableIssue } from "@/lib/queries";
import { createIssue } from "@/lib/sources/github";

const MISSION_OWNER = { commun: "C", a: "A", b: "B", humains: "H" } as const;

/** Livrables au format du contrat (OpenAPI, schéma Deliverable). Filtre ?mission=commun|a|b|humains. */
export async function GET(req: NextRequest) {
  const mission = req.nextUrl.searchParams.get("mission")?.toLowerCase();
  const owner = mission && mission in MISSION_OWNER ? MISSION_OWNER[mission as keyof typeof MISSION_OWNER] : undefined;
  const d = await getDeliverables();
  return sourcedAs(d, (list) => (owner ? list.filter((x) => x.owner === owner) : list).map(deliverableToApi));
}

const Body = z.object({
  title: z.string().trim().min(3).max(120),
  mission: z.enum(["commun", "a", "b"]),
  type: z.string().trim().min(2).max(24).regex(/^[\p{L} -]+$/u),
  days: z.tuple([z.number().int().min(1).max(10), z.number().int().min(1).max(10)]).refine(([a, b]) => a <= b, "Jour de fin avant le jour de début"),
  path: z.string().trim().max(160).optional(),
});

/** Crée un livrable (issue « livrable », statut À faire). Niveau 2 : garde, motif et audit (lib/api/audit.ts). */
export async function POST(req: NextRequest) {
  return audited(req, { action: "deliverable.create", level: 2, resource: { type: "deliverable", id: "new" } }, async (raw) => {
    const parsed = Body.safeParse(raw);
    if (!parsed.success) return problem(400, "Livrable invalide", parsed.error.issues.map((i) => i.message).join(" · "));
    const { type, ...rest } = parsed.data;
    const r = await createIssue(newDeliverableIssue({ ...rest, kind: type }));
    if (!r.ok) return writeRefused(r.status);
    return sourced({ value: deliverableToApi(issueToDeliverable(r.issue)), source: `S1 · GitHub issue #${r.issue.number}`, fetchedAt: new Date().toISOString(), freshness: "live", demo: false }, { status: 201 });
  });
}
