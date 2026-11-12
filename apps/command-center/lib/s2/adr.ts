/**
 * S2 · Documents : registre des ADR lus dans `docs/adr/` sur develop.
 * En-tête attendu : title, owner, status, version, updated. Fonctions pures, testées dans adr.test.ts.
 */
import type { Etat } from "../types";

export interface Adr {
  id: string;
  titre: string;
  statut: string;
  porteur?: string;
  version?: string;
  majLe?: string;
  chemin: string;
  lien: string;
}

/** Lit l'en-tête YAML simple (clé: valeur sur une ligne). Pas de YAML imbriqué dans ces fichiers. */
export function lireEntete(texte: string): Record<string, string> {
  const m = texte.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const champs: Record<string, string> = {};
  for (const ligne of m[1]!.split(/\r?\n/)) {
    const c = ligne.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (c) champs[c[1]!] = c[2]!.trim().replace(/^"(.*)"$/, "$1");
  }
  return champs;
}

export function versAdr(chemin: string, texte: string, lien: string): Adr {
  const e = lireEntete(texte);
  const id = chemin.match(/ADR-\d{4}/)?.[0] ?? chemin;
  const titre = (e.title ?? id).replace(new RegExp(`^${id}\\s*[—–-]\\s*`), "");
  return { id, titre, statut: (e.status ?? "INCONNU").toUpperCase(), porteur: e.owner, version: e.version, majLe: e.updated, chemin, lien };
}

/** Statut d'ADR vers état NEXUS. Une ADR proposée attend une décision humaine. */
export function etatAdr(statut: string): { etat: Etat; libelle: string } {
  switch (statut) {
    case "ACCEPTED":
      return { etat: "ok", libelle: "Acceptée" };
    case "PROPOSED":
      return { etat: "attention", libelle: "Proposée" };
    case "REJECTED":
      return { etat: "inconnu", libelle: "Rejetée" };
    case "SUPERSEDED":
      return { etat: "inconnu", libelle: "Remplacée" };
    default:
      return { etat: "inconnu", libelle: "Statut inconnu" };
  }
}
