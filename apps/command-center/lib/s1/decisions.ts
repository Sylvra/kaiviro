/**
 * S1 · Décisions : issues GitHub portant le label `decision`.
 * Corps attendu (convention du dépôt) : une ligne de question, un paragraphe de contexte,
 * puis une section « ## Options » en liste. Fonctions pures, testées dans decisions.test.ts.
 */
import type { GhIssue } from "./mapping";

export type Porteur = "Humains" | "Mission A" | "Mission B" | "Inconnu";

export interface Decision {
  id: string;
  numero: number;
  titre: string;
  /** Ouverte : à trancher. Fermée : tranchée sur GitHub. */
  tranchee: boolean;
  porteur: Porteur;
  /** Référence documentaire (label `ref:`), par exemple « ADR-0004 ». */
  reference?: string;
  question?: string;
  contexte?: string;
  options: string[];
  ouverteLe: string;
  trancheeLe?: string;
  lien: string;
}

const PORTEURS: Record<string, Porteur> = { humains: "Humains", a: "Mission A", b: "Mission B" };

/** Découpe le corps : question, contexte, options. Rien n'est deviné si la convention manque. */
export function lireCorps(body: string | null): Pick<Decision, "question" | "contexte" | "options"> {
  if (!body?.trim()) return { options: [] };
  const [avant = "", apres = ""] = body.split(/^##\s+Options\s*$/im);
  const blocs = avant
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  const options = apres
    .split("\n")
    .map((l) => l.match(/^\s*[-*]\s+(.+)$/)?.[1]?.trim())
    .filter((o): o is string => Boolean(o));
  return { question: blocs[0], contexte: blocs.slice(1).join("\n\n") || undefined, options };
}

export function versDecision(i: GhIssue): Decision | null {
  const noms = i.labels.map((l) => l.name);
  if (i.pull_request || !noms.includes("decision")) return null;
  const porteur = PORTEURS[noms.find((l) => l.startsWith("owner:"))?.slice(6) ?? ""] ?? "Inconnu";
  return {
    id: `gh-${i.number}`,
    numero: i.number,
    titre: i.title,
    tranchee: i.state === "closed",
    porteur,
    reference: noms.find((l) => l.startsWith("ref:"))?.slice(4),
    ...lireCorps(i.body),
    ouverteLe: i.created_at,
    trancheeLe: i.closed_at ?? undefined,
    lien: i.html_url,
  };
}

/** À trancher d'abord, puis par numéro décroissant. */
export function trierDecisions(d: Decision[]): Decision[] {
  return [...d].sort((a, b) => Number(a.tranchee) - Number(b.tranchee) || b.numero - a.numero);
}
