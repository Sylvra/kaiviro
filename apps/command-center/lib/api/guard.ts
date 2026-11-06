import "server-only";
import type { NextRequest } from "next/server";
import { problem } from "./respond";
import { githubConfigured } from "@/lib/sources/github";

/**
 * Garde commune des écritures (niveau 2, ADR-0012) tant que l'authentification admin n'existe pas (CC-M3) :
 * serveur lié à 127.0.0.1, JSON obligatoire (impose un preflight CORS) et origine du même hôte.
 * Renvoie une réponse d'erreur, ou null si la requête peut continuer.
 */
export function guardWrite(req: NextRequest, { github = true }: { github?: boolean } = {}) {
  if (!req.headers.get("content-type")?.startsWith("application/json")) {
    return problem(415, "Type de contenu refusé", "Attendu : application/json");
  }
  // req.nextUrl peut réécrire 127.0.0.1 en localhost : on compare l'hôte de l'origine à l'en-tête Host.
  const origin = req.headers.get("origin");
  const sameHost = (() => { try { return new URL(origin ?? "").host === req.headers.get("host"); } catch { return false; } })();
  if (origin && !sameHost) return problem(403, "Origine refusée");
  if (github && !githubConfigured()) return problem(503, "GitHub non connecté", "Renseigner GITHUB_REPO et GITHUB_TOKEN dans .env.local.");
  return null;
}

export function writeRefused(status: number) {
  const detail = status === 403 || status === 404
    ? "Le jeton GitHub n’a pas le droit Issues: write sur ce dépôt."
    : `GitHub a répondu ${status}.`;
  return problem(502, "GitHub a refusé la mise à jour", detail);
}
