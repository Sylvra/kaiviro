import type { NextRequest } from "next/server";
import { z } from "zod";
import { problem, sourced } from "@/lib/api/respond";
import { guardWrite, writeRefused } from "@/lib/api/guard";
import { getDeliverables, issueToDeliverable, newDeliverableIssue } from "@/lib/queries";
import { createIssue } from "@/lib/sources/github";

export async function GET(req: NextRequest) {
  const mission = req.nextUrl.searchParams.get("mission")?.toUpperCase();
  const d = await getDeliverables();
  const value = mission && d.value ? d.value.filter((x) => x.owner === mission) : d.value;
  return sourced({ ...d, value });
}

const Body = z.object({
  title: z.string().trim().min(3).max(120),
  mission: z.enum(["commun", "a", "b"]),
  kind: z.string().trim().min(2).max(24).regex(/^[\p{L} -]+$/u),
  days: z.tuple([z.number().int().min(1).max(10), z.number().int().min(1).max(10)]).refine(([a, b]) => a <= b, "Jour de fin avant le jour de début"),
  path: z.string().trim().max(160).optional(),
});

/** Crée un livrable (issue « livrable », statut À faire). Niveau 2, garde : lib/api/guard.ts. */
export async function POST(req: NextRequest) {
  const refused = guardWrite(req);
  if (refused) return refused;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(400, "Livrable invalide", parsed.error.issues.map((i) => i.message).join(" · "));

  const r = await createIssue(newDeliverableIssue(parsed.data));
  if (!r.ok) return writeRefused(r.status);
  return sourced({ value: issueToDeliverable(r.issue), source: `S1 · GitHub issue #${r.issue.number}`, fetchedAt: new Date().toISOString(), freshness: "live", demo: false }, { status: 201 });
}
