/**
 * Jour courant du plan M0, en jours ouvrés depuis la date de début :
 * lundi à vendredi, hors jours fériés nationaux de France métropolitaine.
 * Les jours fériés propres à l'Alsace-Moselle ne sont pas retirés.
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

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Dimanche de Pâques (calendrier grégorien, algorithme de Meeus/Jones/Butcher). */
export function easterSunday(year: number): string {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(new Date(Date.UTC(year, month - 1, day, 12)));
}

const holidayCache = new Map<number, Set<string>>();

/** Les 11 jours fériés nationaux de France métropolitaine pour une année (AAAA-MM-JJ). */
export function frenchHolidays(year: number): Set<string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const easter = new Date(`${easterSunday(year)}T12:00:00Z`);
  const plus = (n: number) => iso(new Date(easter.getTime() + n * 86_400_000));
  const fixed = ["01-01", "05-01", "05-08", "07-14", "08-15", "11-01", "11-11", "12-25"].map((md) => `${year}-${md}`);
  const set = new Set([...fixed, plus(1), plus(39), plus(50)]); // lundi de Pâques, Ascension, lundi de Pentecôte
  holidayCache.set(year, set);
  return set;
}

export const isHoliday = (day: string) => frenchHolidays(Number(day.slice(0, 4))).has(day);

/** Nombre de jours ouvrés de start à day inclus (0 si day précède start). Dates AAAA-MM-JJ. */
export function workingDaysBetween(start: string, day: string): number {
  if (!ISO.test(start) || !ISO.test(day) || day < start) return 0;
  const d = new Date(`${start}T12:00:00Z`);
  const end = new Date(`${day}T12:00:00Z`);
  let n = 0;
  while (d <= end) {
    const w = d.getUTCDay();
    if (w !== 0 && w !== 6 && !isHoliday(iso(d))) n++;
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
