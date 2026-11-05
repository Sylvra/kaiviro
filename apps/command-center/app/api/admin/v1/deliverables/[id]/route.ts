import type { NextRequest } from "next/server";
import { z } from "zod";
import { problem, sourced } from "@/lib/api/respond";
import { guardWrite, writeRefused } from "@/lib/api/guard";
import { issueToDeliverable, statusPatch } from "@/lib/queries";
import { getIssue, updateIssue } from "@/lib/sources/github";
import type { Status } from "@/lib/data/plan";

const Body = z.object({ status: z.number().int().min(0).max(3) });

/** Écriture du statut d'un livrable dans GitHub (niveau 2, CC-M1 règle 4). Garde : lib/api/guard.ts. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const refused = guardWrite(req);
  if (refused) return refused;

  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(400, "Corps invalide", "Attendu : { status: 0 | 1 | 2 | 3 }");
  const m = /^gh-(\d+)$/.exec(id);
  if (!m) return problem(404, "Livrable inconnu", "Seuls les livrables issus de GitHub peuvent être modifiés.");

  const n = Number(m[1]);
  const current = await getIssue(n);
  if (!current || !current.data.labels.some((l) => l.name === "livrable")) {
    return problem(404, "Livrable inconnu", `L’issue #${n} n’existe pas ou n’a pas le label « livrable ».`);
  }

  const r = await updateIssue(n, statusPatch(current.data.labels.map((l) => l.name), parsed.data.status as Status));
  if (!r.ok) return writeRefused(r.status);
  return sourced({ value: issueToDeliverable(r.issue), source: `S1 · GitHub issue #${n}`, fetchedAt: new Date().toISOString(), freshness: "live", demo: false });
}
