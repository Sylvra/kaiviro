/**
 * Jour courant du plan M0, en jours ouvrés (lundi à vendredi) depuis la date de début.
 * Les jours fériés ne sont pas retirés : écart possible d'un jour, signalé dans l'interface.
 */
export interface PlanDay {
  /** 1 à total ; 0 avant la date de début */
  current: number;
  total: number;
  /** date de début, AAAA-MM-JJ */
  start: string;
  /** le plan a dépassé son dernier jour */
  over: boolean;
  /** jours ouvrés écoulés au-delà du dernier jour */
  overBy: number;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Date du jour au format AAAA-MM-JJ dans le fuseau de Paris. */
export function todayInParis(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Nombre de jours ouvrés de start à day inclus (0 si day précède start). Dates AAAA-MM-JJ. */
export function workingDaysBetween(start: string, day: string): number {
  if (!ISO.test(start) || !ISO.test(day) || day < start) return 0;
  const d = new Date(`${start}T12:00:00Z`);
  const end = new Date(`${day}T12:00:00Z`);
  let n = 0;
  while (d <= end) {
    const w = d.getUTCDay();
    if (w !== 0 && w !== 6) n++;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return n;
}

export function planDayAt(start: string, today: string, total: number): PlanDay | null {
  if (!ISO.test(start) || Number.isNaN(Date.parse(start))) return null;
  const n = workingDaysBetween(start, today);
  return { current: Math.min(n, total), total, start, over: n > total, overBy: Math.max(0, n - total) };
}

/** Étiquette de phase : jalon en cours, démarrage, ou plan dépassé. */
export function phaseLabel(p: PlanDay | null, milestones: { days: [number, number]; label: string }[]): string {
  if (!p) return "Jour inconnu";
  if (p.current === 0) return "Pas commencé";
  if (p.over) return "Plan dépassé";
  const m = milestones.find((x) => p.current >= x.days[0] && p.current <= x.days[1]);
  if (m) return m.label;
  return p.current <= 2 ? "Démarrage" : "En cours";
}
