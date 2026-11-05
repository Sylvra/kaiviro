import type { NextRequest } from "next/server";
import { z } from "zod";
import { problem, sourced } from "@/lib/api/respond";
import { guardWrite, writeRefused } from "@/lib/api/guard";
import { deliverableNotes, editPatch, issueToDeliverable, statusPatch, toComment } from "@/lib/queries";
import { getIssue, listComments, updateIssue } from "@/lib/sources/github";
import type { Status } from "@/lib/data/plan";

const Body = z.object({
  status: z.number().int().min(0).max(3).optional(),
  title: z.string().trim().min(3).max(120).optional(),
  mission: z.enum(["commun", "a", "b"]).optional(),
  kind: z.string().trim().min(2).max(24).regex(/^[\p{L} -]+$/u).optional(),
  days: z.tuple([z.number().int().min(1).max(10), z.number().int().min(1).max(10)]).refine(([a, b]) => a <= b, "Jour de fin avant le jour de début").optional(),
  path: z.string().trim().max(160).optional(),
}).refine((b) => Object.values(b).some((v) => v !== undefined), "Aucune modification");

/** Fiche d'un livrable : issue, notes et commentaires GitHub (lecture). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = /^gh-(\d+)$/.exec(id);
  if (!m) return problem(404, "Livrable inconnu", "Seuls les livrables issus de GitHub ont une fiche.");
  const n = Number(m[1]);
  const [issue, comments] = await Promise.all([getIssue(n), listComments(n)]);
  if (!issue || !issue.data.labels.some((l) => l.name === "livrable")) {
    return problem(404, "Livrable inconnu", `L’issue #${n} n’existe pas, n’a pas le label « livrable » ou GitHub ne répond pas.`);
  }
  return sourced({
    value: { deliverable: issueToDeliverable(issue.data), notes: deliverableNotes(issue.data.body), comments: (comments?.data ?? []).map(toComment), commentsKnown: comments !== null },
    source: `S1 · GitHub issue #${n}`, fetchedAt: issue.fetchedAt, freshness: "live", demo: false,
  });
}

/**
 * Modifie un livrable dans GitHub (niveau 2, CC-M1 règle 4) : statut et/ou titre, mission, type, jours, chemin.
 * Garde : lib/api/guard.ts.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const refused = guardWrite(req);
  if (refused) return refused;

  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(400, "Modification invalide", parsed.error.issues.map((i) => i.message).join(" · "));
  const m = /^gh-(\d+)$/.exec(id);
  if (!m) return problem(404, "Livrable inconnu", "Seuls les livrables issus de GitHub peuvent être modifiés.");

  const n = Number(m[1]);
  const current = await getIssue(n);
  if (!current || !current.data.labels.some((l) => l.name === "livrable")) {
    return problem(404, "Livrable inconnu", `L’issue #${n} n’existe pas ou n’a pas le label « livrable ».`);
  }

  const { status, ...edit } = parsed.data;
  const edited = editPatch({ title: current.data.title, body: current.data.body, labels: current.data.labels.map((l) => l.name) }, edit);
  const patch = status === undefined ? edited : { ...edited, ...statusPatch(edited.labels, status as Status) };
  const r = await updateIssue(n, patch);
  if (!r.ok) return writeRefused(r.status);
  return sourced({ value: issueToDeliverable(r.issue), source: `S1 · GitHub issue #${n}`, fetchedAt: new Date().toISOString(), freshness: "live", demo: false });
}
