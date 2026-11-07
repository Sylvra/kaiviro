/**
 * Supervision de la Raspberry Pi (S4 Uptime Kuma, S5 Prometheus + Node Exporter + cAdvisor, S6 sauvegardes).
 * Types et parseurs purs : aucun accès réseau ici. Une valeur absente reste null, jamais 0 ni « sain ».
 */
export type Point = [number, number]; // [horodatage s, valeur]

export interface PiHost {
  /** fractions 0–1 */
  cpu: number | null;
  mem: number | null;
  disk: number | null;
  memTotal: number | null;
  /** °C */
  temp: number | null;
  load1: number | null;
  uptime: number | null;
  /** octets/s */
  netRx: number | null;
  netTx: number | null;
  series: { cpu: Point[]; mem: Point[]; temp: Point[] };
}

export interface Container { name: string; cpu: number | null; mem: number | null; lastSeen: number | null; up: boolean }
export interface Monitor { name: string; up: boolean | null; uptime24: number | null; ping: number | null }
export interface BackupRun {
  id: string; kind: "backup" | "restore_test"; scope: string; started_at: string; finished_at: string;
  result: "running" | "succeeded" | "failed" | "partial"; repository?: string; error?: string | null; restore_verified?: boolean | null;
}

interface PromSample { metric: Record<string, string>; value?: [number, string]; values?: [number, string][] }
interface PromResponse { status: string; data?: { resultType: string; result: PromSample[] } }

/** Résultat d'une requête instantanée : un échantillon par série, valeurs non numériques ignorées. */
export function parseVector(json: unknown): { labels: Record<string, string>; value: number }[] {
  const r = json as PromResponse;
  if (r?.status !== "success" || r.data?.resultType !== "vector") return [];
  return r.data.result.flatMap((s) => {
    const v = Number(s.value?.[1]);
    return Number.isFinite(v) ? [{ labels: s.metric ?? {}, value: v }] : [];
  });
}

/** Première série d'une requête sur période (pour les courbes). */
export function parseMatrix(json: unknown): Point[] {
  const r = json as PromResponse;
  if (r?.status !== "success" || r.data?.resultType !== "matrix") return [];
  return (r.data.result[0]?.values ?? []).flatMap(([t, v]) => (Number.isFinite(Number(v)) ? [[t, Number(v)] as Point] : []));
}

export const first = (rows: { value: number }[]): number | null => rows[0]?.value ?? null;

/** Requêtes PromQL de la Pi (Node Exporter) et des conteneurs (cAdvisor). */
export const PROMQL = {
  cpu: '1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))',
  mem: "1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes",
  memTotal: "node_memory_MemTotal_bytes",
  disk: '1 - node_filesystem_avail_bytes{mountpoint="/",fstype!="rootfs"} / node_filesystem_size_bytes{mountpoint="/",fstype!="rootfs"}',
  temp: "max(node_thermal_zone_temp)",
  load1: "node_load1",
  uptime: "time() - node_boot_time_seconds",
  netRx: 'sum(rate(node_network_receive_bytes_total{device!~"lo|veth.*|docker.*|br-.*"}[5m]))',
  netTx: 'sum(rate(node_network_transmit_bytes_total{device!~"lo|veth.*|docker.*|br-.*"}[5m]))',
  containerCpu: 'sum by (name) (rate(container_cpu_usage_seconds_total{name!=""}[5m]))',
  containerMem: 'sum by (name) (container_memory_working_set_bytes{name!=""})',
  containerSeen: 'time() - max by (name) (container_last_seen{name!=""})',
} as const;

/** Assemble la liste des conteneurs ; « up » si cAdvisor l'a vu dans les 2 dernières minutes. */
export function mergeContainers(cpu: { labels: Record<string, string>; value: number }[], mem: typeof cpu, seen: typeof cpu): Container[] {
  const names = new Set([...cpu, ...mem, ...seen].map((r) => r.labels.name).filter((n): n is string => Boolean(n)));
  const pick = (rows: typeof cpu, n: string) => rows.find((r) => r.labels.name === n)?.value ?? null;
  return [...names].sort().map((name) => {
    const lastSeen = pick(seen, name);
    return { name, cpu: pick(cpu, name), mem: pick(mem, name), lastSeen, up: lastSeen !== null && lastSeen < 120 };
  });
}

/** Page de statut publique d'Uptime Kuma : moniteurs + derniers battements. */
export function parseKuma(page: unknown, heartbeat: unknown): Monitor[] {
  const p = page as { publicGroupList?: { monitorList?: { id: number; name: string }[] }[] };
  const h = heartbeat as { heartbeatList?: Record<string, { status: number; ping: number | null }[]>; uptimeList?: Record<string, number> };
  return (p?.publicGroupList ?? []).flatMap((g) => g.monitorList ?? []).map((m) => {
    const beats = h?.heartbeatList?.[String(m.id)] ?? [];
    const last = beats[beats.length - 1];
    const uptime = h?.uptimeList?.[`${m.id}_24`];
    return { name: m.name, up: last ? last.status === 1 : null, uptime24: typeof uptime === "number" ? uptime : null, ping: last?.ping ?? null };
  });
}

export type Health = "ok" | "warn" | "alert" | "unknown";

/** Seuils de lecture rapide (affichage seulement ; ajustables). */
export function hostHealth(h: PiHost | null): Health {
  if (!h || h.cpu === null) return "unknown";
  if ((h.temp ?? 0) >= 80 || (h.disk ?? 0) >= 0.9 || (h.mem ?? 0) >= 0.92) return "alert";
  if ((h.temp ?? 0) >= 70 || (h.disk ?? 0) >= 0.8 || (h.mem ?? 0) >= 0.8 || h.cpu >= 0.85) return "warn";
  return "ok";
}

export function fmtBytes(n: number | null): string {
  if (n === null) return "—";
  const u = ["o", "Ko", "Mo", "Go", "To"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

export function fmtDuration(s: number | null): string {
  if (s === null) return "—";
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d ? `${d} j ${h} h` : h ? `${h} h ${m} min` : `${m} min`;
}
