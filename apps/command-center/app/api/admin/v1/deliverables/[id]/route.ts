import type { NextRequest } from "next/server";
import { z } from "zod";
import { problem, sourced } from "@/lib/api/respond";
import { issueToDeliverable, statusPatch } from "@/lib/queries";
import { getIssue, githubConfigured, updateIssue } from "@/lib/sources/github";
import type { Status } from "@/lib/data/plan";

const Body = z.object({ status: z.number().int().min(0).max(3) });

/**
 * Écriture du statut d'un livrable dans GitHub (niveau 2, CC-M1 règle 4).
 * Active seulement si le jeton a Issues: write. Pas d'authentification avant CC-M3 (ADR-0012) :
 * le serveur reste lié à 127.0.0.1, et l'en-tête JSON + l'origine identique bloquent les requêtes d'autres sites.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!req.headers.get("content-type")?.startsWith("application/json")) {
    return problem(415, "Type de contenu refusé", "Attendu : application/json");
  }
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return problem(403, "Origine refusée");

  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return problem(400, "Corps invalide", "Attendu : { status: 0 | 1 | 2 | 3 }");
  const m = /^gh-(\d+)$/.exec(id);
  if (!m) return problem(404, "Livrable inconnu", "Seuls les livrables issus de GitHub peuvent être modifiés.");
  if (!githubConfigured()) return problem(503, "GitHub non connecté", "Renseigner GITHUB_REPO et GITHUB_TOKEN dans .env.local.");

  const n = Number(m[1]);
  const current = await getIssue(n);
  if (!current || !current.data.labels.some((l) => l.name === "livrable")) {
    return problem(404, "Livrable inconnu", `L’issue #${n} n’existe pas ou n’a pas le label « livrable ».`);
  }

  const r = await updateIssue(n, statusPatch(current.data.labels.map((l) => l.name), parsed.data.status as Status));
  if (!r.ok) {
    const detail = r.status === 403 || r.status === 404
      ? "Le jeton GitHub n’a pas le droit Issues: write sur ce dépôt."
      : `GitHub a répondu ${r.status}.`;
    return problem(502, "GitHub a refusé la mise à jour", detail);
  }
  return sourced({ value: issueToDeliverable(r.issue), source: `S1 · GitHub issue #${n}`, fetchedAt: new Date().toISOString(), freshness: "live", demo: false });
}
