import type { Etat, Mission, StatutTache } from "./types";

interface Ton {
  label: string;
  dot: string;
  bg: string;
  ink: string;
}

/** Jetons CSS par état. Une couleur n'est jamais seule : un libellé l'accompagne toujours. */
export const ETAT: Record<Etat, Ton> = {
  ok: { label: "OK", dot: "var(--ok)", bg: "var(--ok-bg)", ink: "var(--ok-ink)" },
  attention: { label: "Attention", dot: "var(--warn)", bg: "var(--warn-bg)", ink: "var(--warn-ink)" },
  alerte: { label: "Alerte", dot: "var(--crit)", bg: "var(--crit-bg)", ink: "var(--crit-ink)" },
  inconnu: { label: "Inconnu", dot: "var(--unk)", bg: "var(--unk-bg)", ink: "var(--unk-ink)" },
};

export const STATUT: Record<StatutTache, Ton> = {
  todo: { label: "À faire", dot: "var(--unk)", bg: "var(--unk-bg)", ink: "var(--ink-2)" },
  doing: { label: "En cours", dot: "var(--doing)", bg: "var(--doing-bg)", ink: "var(--doing-ink)" },
  review: { label: "En revue", dot: "var(--review)", bg: "var(--review-bg)", ink: "var(--review-ink)" },
  done: { label: "Terminée", dot: "var(--ok)", bg: "var(--ok-bg)", ink: "var(--ok-ink)" },
};

export const MISSION: Record<Mission, { label: string; bg: string; ink: string }> = {
  A: { label: "Mission A", bg: "var(--accent-soft)", ink: "var(--accent-ink)" },
  B: { label: "Mission B", bg: "var(--review-bg)", ink: "var(--review-ink)" },
  C: { label: "Commun", bg: "var(--common-bg)", ink: "var(--common-ink)" },
};

export function ton(e: Etat | StatutTache): Ton {
  return e in ETAT ? ETAT[e as Etat] : STATUT[e as StatutTache];
}

/** Libellé d'échéance à partir des jours restants. */
export function libelleEcheance(jours: number): { texte: string; ton: "retard" | "jour" | "normal" } {
  if (jours < 0) return { texte: `En retard · ${-jours} j`, ton: "retard" };
  if (jours === 0) return { texte: "Aujourd’hui", ton: "jour" };
  return { texte: `Dans ${jours} j`, ton: "normal" };
}
