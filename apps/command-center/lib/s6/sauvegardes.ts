/**
 * S6 · État des sauvegardes, publié par infrastructure/backups/metriques.sh et lu via Prometheus.
 * Fonctions pures, testées dans sauvegardes.test.ts.
 * Seuils : propositions de BACKUP_AND_RESTORE §8 (48 h pour une sauvegarde, 35 jours pour un test de restauration).
 */
import type { Etat } from "../types";
import type { Echantillon } from "../s5/mapping";

export const REQUETES_S6 = {
  passage: "kaiviro_backup_last_run_timestamp_seconds",
  succes: "kaiviro_backup_last_success_timestamp_seconds",
  resultat: "kaiviro_backup_last_result == 1",
} as const;

export const SEUILS_HEURES = { backup: 48, restore_test: 35 * 24 } as const;

export type Genre = keyof typeof SEUILS_HEURES;

export interface EtatSauvegarde {
  genre: Genre;
  perimetre: string;
  depot: string;
  dernierPassage?: number;
  dernierSucces?: number;
  resultat?: string;
  etat: Etat;
  libelle: string;
}

const cle = (m: Record<string, string>) => `${m.kind}|${m.scope}|${m.repository}`;

/** Heures écoulées, arrondies vers le bas. */
const heures = (depuis: number, maintenant: number) => Math.floor((maintenant - depuis) / 3600);

export function age(secondes: number, maintenant: number): string {
  const h = heures(secondes, maintenant);
  return h < 1 ? "il y a moins d’une heure" : h < 48 ? `il y a ${h} h` : `il y a ${Math.floor(h / 24)} j`;
}

export function versEtats(r: Record<keyof typeof REQUETES_S6, Echantillon[] | null>, maintenant: number): EtatSauvegarde[] {
  const succes = new Map((r.succes ?? []).map((e) => [cle(e.metric), Number(e.value[1])]));
  const resultats = new Map((r.resultat ?? []).map((e) => [cle(e.metric), e.metric.result]));

  return (r.passage ?? []).map((e): EtatSauvegarde => {
    const genre: Genre = e.metric.kind === "restore_test" ? "restore_test" : "backup";
    const k = cle(e.metric);
    const dernierSucces = succes.get(k);
    const resultat = resultats.get(k);
    const base = {
      genre,
      perimetre: e.metric.scope ?? "inconnu",
      depot: e.metric.repository ?? "inconnu",
      dernierPassage: Number(e.value[1]),
      dernierSucces,
      resultat,
    };

    if (resultat === "failed") return { ...base, etat: "alerte", libelle: "Dernier passage en échec" };
    if (dernierSucces === undefined) return { ...base, etat: "alerte", libelle: "Jamais réussie" };
    if (heures(dernierSucces, maintenant) > SEUILS_HEURES[genre])
      return { ...base, etat: "alerte", libelle: `Dernier succès trop ancien (plus de ${genre === "backup" ? "48 h" : "35 jours"})` };
    if (resultat === "partial")
      return { ...base, etat: "attention", libelle: genre === "backup" ? "Faite, rétention en échec" : "Restaurée, témoins à vérifier" };
    return { ...base, etat: "ok", libelle: genre === "backup" ? "Réussie" : "Restauration vérifiée" };
  });
}
