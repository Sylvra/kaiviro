import type { NextRequest } from "next/server";
import { z } from "zod";
import { problem } from "@/lib/api/respond";
import { guardWrite, writeRefused } from "@/lib/api/guard";
import { decisionComment } from "@/lib/queries";
import { commentIssue, getIssue, updateIssue } from "@/lib/sources/github";

const Body = z.object({
  action: z.enum(["comment", "resolve", "reopen"]),
  option: z.string().trim().max(200).optional(),
  note: z.string().trim().max(2000).optional(),
});

/**
 * Décision (issue « decision ») : commenter, trancher (commentaire + fermeture) ou rouvrir.
 * Niveau 2, garde : lib/api/guard.ts. L'ADR liée reste à mettre à jour dans une PR.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const refused = guardWrite(req);
  if (refused) return refused;

  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(400, "Corps invalide", "Attendu : { action: comment | resolve | reopen, option?, note? }");
  const { action, option, note } = parsed.data;
  if (action === "comment" && !note) return problem(400, "Avis vide");

  const m = /^gh-(\d+)$/.exec(id);
  if (!m) return problem(404, "Décision inconnue", "Seules les décisions issues de GitHub peuvent être modifiées.");
  const n = Number(m[1]);
  const current = await getIssue(n);
  if (!current || !current.data.labels.some((l) => l.name === "decision")) {
    return problem(404, "Décision inconnue", `L’issue #${n} n’existe pas ou n’a pas le label « decision ».`);
  }

  const body = decisionComment(action, option, note);
  if (body) {
    const c = await commentIssue(n, body);
    if (!c.ok) return writeRefused(c.status);
  }
  if (action !== "comment") {
    const r = await updateIssue(n, action === "resolve" ? { state: "closed", state_reason: "completed" } : { state: "open", state_reason: "reopened" });
    if (!r.ok) return writeRefused(r.status);
  }
  return Response.json({ ok: true, action, issue: n }, { headers: { "Cache-Control": "no-store" } });
}
