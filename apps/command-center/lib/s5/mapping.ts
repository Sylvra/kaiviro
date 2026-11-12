/**
 * S5 · Prometheus et Node Exporter : conversion des réponses de l'API en objets NEXUS.
 * Fonctions pures, testées dans mapping.test.ts. Aucun seuil d'alerte n'est inventé :
 * un service est sain seulement si systemd le dit actif, inconnu s'il n'est pas mesuré.
 */
import type { Etat, Serie, Service } from "../types";

export interface Echantillon {
  metric: Record<string, string>;
  value: [number, string];
}

export interface SerieBrute {
  metric: Record<string, string>;
  values: [number, string][];
}

/** Requêtes PromQL. Les noms sont ceux de Node Exporter 1.x. */
export const REQUETES = {
  cpu: '100 * (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])))',
  memoire: "100 * (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)",
  temperature: "max(node_thermal_zone_temp)",
  disque: '100 * (1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})',
  ssd: '100 * (1 - node_filesystem_avail_bytes{mountpoint="/srv"} / node_filesystem_size_bytes{mountpoint="/srv"})',
  demarrage: "time() - node_boot_time_seconds",
  ventilateur: "max(node_hwmon_fan_rpm)",
  services: 'node_systemd_unit_state{state=~"active|failed|inactive|activating|deactivating"} == 1',
} as const;

/** Séries affichées sur la fiche, dans cet ordre. */
export const SERIES: { cle: keyof typeof REQUETES; libelle: string; unite: string; max: number }[] = [
  { cle: "cpu", libelle: "CPU", unite: "%", max: 100 },
  { cle: "memoire", libelle: "Mémoire", unite: "%", max: 100 },
  { cle: "temperature", libelle: "Température", unite: "°C", max: 90 },
  { cle: "disque", libelle: "Disque système", unite: "%", max: 100 },
];

/** Unités suivies, avec leur rôle et l'action prévue. Les rôles sont saisis dans NEXUS. */
export const UNITES: { nom: string; role: string; action: string }[] = [
  { nom: "prometheus", role: "Collecte des métriques", action: "Redémarrer · NX-3" },
  { nom: "prometheus-node-exporter", role: "Métriques de l’hôte", action: "Redémarrer · NX-3" },
  { nom: "tailscaled", role: "Accès VPN", action: "Aucune (accès)" },
  { nom: "ssh", role: "Administration", action: "Aucune (accès)" },
  { nom: "valheim", role: "Serveur personnel, hors KAIVIRO", action: "Lecture seule" },
  { nom: "valheim-app", role: "Interface du serveur personnel", action: "Lecture seule" },
];

const arrondi = (n: number) => Math.round(n * 10) / 10;

/** Première valeur d'un vecteur, ou null si absente ou non numérique. */
export function valeur(v: Echantillon[] | null): number | null {
  const s = v?.[0]?.value[1];
  if (s === undefined) return null;
  const n = Number(s);
  return Number.isFinite(n) ? arrondi(n) : null;
}

export function versSerie(def: (typeof SERIES)[number], brute: SerieBrute[] | null): Serie {
  const valeurs = (brute?.[0]?.values ?? []).map(([, s]) => Number(s)).filter(Number.isFinite).map(arrondi);
  return { libelle: def.libelle, unite: def.unite, max: def.max, valeurs };
}

const ETAT_SYSTEMD: Record<string, { etat: Etat; libelle: string }> = {
  active: { etat: "ok", libelle: "actif" },
  failed: { etat: "alerte", libelle: "en échec" },
  inactive: { etat: "attention", libelle: "arrêté" },
  activating: { etat: "attention", libelle: "démarrage" },
  deactivating: { etat: "attention", libelle: "arrêt en cours" },
};

/** Services suivis. Une unité absente des mesures reste « inconnu ». */
export function versServices(v: Echantillon[] | null): Service[] {
  const etats = new Map((v ?? []).map((e) => [e.metric.name?.replace(/\.service$/, ""), e.metric.state]));
  return UNITES.map((u) => {
    const s = v ? etats.get(u.nom) : undefined;
    const e = s ? ETAT_SYSTEMD[s] : undefined;
    return { ...u, etat: e?.etat ?? "inconnu", libelleEtat: e?.libelle ?? "non mesuré" };
  });
}

/** État global du nœud : alerte si un service tombe, attention s'il est arrêté, ok si tout est actif. */
export function etatNoeud(services: Service[], joignable: boolean): { etat: Etat; libelle: string } {
  if (!joignable) return { etat: "inconnu", libelle: "Inconnu · Prometheus injoignable" };
  const n = (e: Etat) => services.filter((s) => s.etat === e).length;
  const pl = (k: number, mot: string) => `${k} ${mot}${k > 1 ? "s" : ""}`;
  if (n("alerte")) return { etat: "alerte", libelle: `${pl(n("alerte"), "service")} en échec` };
  if (n("attention")) return { etat: "attention", libelle: `${pl(n("attention"), "service")} arrêté${n("attention") > 1 ? "s" : ""}` };
  if (n("inconnu")) return { etat: "inconnu", libelle: `${pl(n("inconnu"), "service")} non mesuré${n("inconnu") > 1 ? "s" : ""}` };
  return { etat: "ok", libelle: "OK · services actifs" };
}

/** Durée lisible depuis le démarrage. */
export function duree(secondes: number | null): string {
  if (secondes === null) return "Inconnu";
  const j = Math.floor(secondes / 86_400);
  const h = Math.floor((secondes % 86_400) / 3600);
  return j > 0 ? `${j} j ${h} h` : `${h} h`;
}

/* ---------- Supervision : cibles de collecte et état de Prometheus ---------- */

export interface CibleBrute {
  labels: Record<string, string>;
  scrapeUrl: string;
  lastError: string;
  lastScrape: string;
  lastScrapeDuration: number;
  health: "up" | "down" | "unknown";
  scrapeInterval: string;
}

export interface Cible {
  job: string;
  adresse: string;
  etat: Etat;
  libelle: string;
  derniereCollecte: string;
  dureeMs: number | null;
  intervalle: string;
  erreur?: string;
}

const JOBS: Record<string, string> = { node: "Node Exporter (hôte)", prometheus: "Prometheus (lui-même)" };

export function versCibles(brutes: CibleBrute[] | null): Cible[] {
  return (brutes ?? []).map((c) => ({
    job: JOBS[c.labels.job ?? ""] ?? c.labels.job ?? "inconnu",
    adresse: c.labels.instance ?? c.scrapeUrl,
    etat: c.health === "up" ? "ok" : c.health === "down" ? "alerte" : "inconnu",
    libelle: c.health === "up" ? "collectée" : c.health === "down" ? "en échec" : "inconnue",
    derniereCollecte: c.lastScrape,
    dureeMs: Number.isFinite(c.lastScrapeDuration) ? Math.round(c.lastScrapeDuration * 1000) : null,
    intervalle: c.scrapeInterval,
    erreur: c.lastError || undefined,
  }));
}

/** Heure de Paris, HH:MM:SS. */
export function heureParis(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", timeStyle: "medium" }).format(d);
}
