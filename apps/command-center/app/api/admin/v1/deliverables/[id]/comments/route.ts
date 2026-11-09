import type { NextRequest } from "next/server";
import { z } from "zod";
import { problem } from "@/lib/api/respond";
import { writeRefused } from "@/lib/api/guard";
import { audited } from "@/lib/api/audit";
import { commentIssue, getIssue } from "@/lib/sources/github";

const Body = z.object({ body: z.string().trim().min(1).max(4000) });

/** Ajoute un commentaire à l'issue d'un livrable. Niveau 2 : garde, motif et audit (lib/api/audit.ts). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return audited(req, { action: "deliverable.comment", level: 2, resource: { type: "deliverable", id } }, async (raw) => {
    const parsed = Body.safeParse(raw);
    if (!parsed.success) return problem(400, "Commentaire vide ou trop long");
    const m = /^gh-(\d+)$/.exec(id);
    if (!m) return problem(404, "Livrable inconnu");
    const n = Number(m[1]);
    const current = await getIssue(n);
    if (!current || !current.data.labels.some((l) => l.name === "livrable")) return problem(404, "Livrable inconnu");
    const r = await commentIssue(n, parsed.data.body);
    if (!r.ok) return writeRefused(r.status);
    return Response.json({ ok: true, issue: n }, { status: 201, headers: { "Cache-Control": "no-store" } });
  });
}
