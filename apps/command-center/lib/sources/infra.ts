import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { Sourced } from "./types";
import { PROMQL, first, mergeContainers, parseKuma, parseMatrix, parseVector, type BackupRun, type Container, type Monitor, type PiHost } from "@/lib/infra";

/**
 * Connecteurs de supervision de la Pi, lus côté serveur par le Command Center (via le VPN en production).
 * S4 Uptime Kuma (page de statut publique), S5 Prometheus (Node Exporter + cAdvisor), S6 journal de sauvegarde.
 * Sans URL configurée ou sans réponse : « unknown », jamais une valeur par défaut.
 */
const env = (k: string) => process.env[k]?.trim().replace(/\/+$/, "") || null;

export function infraConfig() {
  return {
    prometheus: env("PROMETHEUS_URL"),
    kuma: env("UPTIME_KUMA_URL"),
    kumaPage: env("UPTIME_KUMA_STATUS_PAGE"),
    backup: env("BACKUP_STATUS_URL"),
  };
}

async function getJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(4000), headers: { Accept: "application/json" } });
    if (!res.ok) {
      console.warn(`[infra] ${res.status} sur ${new URL(url).pathname}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    unstable_rethrow(e);
    console.warn(`[infra] injoignable : ${new URL(url).host} (${(e as { cause?: { code?: string } }).cause?.code ?? (e as Error).name})`);
    return null;
  }
}

const unknown = <T>(source: string): Sourced<T> => ({ value: null, source, fetchedAt: null, freshness: "unknown", demo: false });
const live = <T>(value: T, source: string): Sourced<T> => ({ value, source, fetchedAt: new Date().toISOString(), freshness: "live", demo: false });

async function promQuery(base: string, q: string) {
  return getJson(`${base}/api/v1/query?query=${encodeURIComponent(q)}`);
}

async function promRange(base: string, q: string) {
  const end = Math.floor(Date.now() / 1000);
  return getJson(`${base}/api/v1/query_range?query=${encodeURIComponent(q)}&start=${end - 3600}&end=${end}&step=60`);
}

/** /infra/pi : CPU, RAM, disque, température, charge, uptime, réseau, et courbes de la dernière heure. */
export async function getPiHost(): Promise<Sourced<PiHost>> {
  const base = infraConfig().prometheus;
  if (!base) return unknown("S5 · Prometheus (PROMETHEUS_URL absent)");
  const keys = ["cpu", "mem", "memTotal", "disk", "temp", "load1", "uptime", "netRx", "netTx"] as const;
  const [values, cpuS, memS, tempS] = await Promise.all([
    Promise.all(keys.map((k) => promQuery(base, PROMQL[k]))),
    promRange(base, PROMQL.cpu), promRange(base, PROMQL.mem), promRange(base, PROMQL.temp),
  ]);
  if (values.every((v) => v === null)) return unknown("S5 · Prometheus (injoignable)");
  const v = Object.fromEntries(keys.map((k, i) => [k, first(parseVector(values[i]))])) as Record<(typeof keys)[number], number | null>;
  return live({ ...v, series: { cpu: parseMatrix(cpuS), mem: parseMatrix(memS), temp: parseMatrix(tempS) } }, "S5 · Prometheus · Node Exporter");
}

/** /infra/containers : conteneurs vus par cAdvisor, CPU (cœurs) et mémoire. */
export async function getContainers(): Promise<Sourced<Container[]>> {
  const base = infraConfig().prometheus;
  if (!base) return unknown("S5 · cAdvisor (PROMETHEUS_URL absent)");
  const [cpu, mem, seen] = await Promise.all([promQuery(base, PROMQL.containerCpu), promQuery(base, PROMQL.containerMem), promQuery(base, PROMQL.containerSeen)]);
  if (cpu === null && mem === null && seen === null) return unknown("S5 · cAdvisor (injoignable)");
  return live(mergeContainers(parseVector(cpu), parseVector(mem), parseVector(seen)), "S5 · Prometheus · cAdvisor");
}

/** Moniteurs Uptime Kuma, via la page de statut publique (aucun identifiant nécessaire). */
export async function getMonitors(): Promise<Sourced<Monitor[]>> {
  const { kuma, kumaPage } = infraConfig();
  if (!kuma || !kumaPage) return unknown("S4 · Uptime Kuma (UPTIME_KUMA_URL ou UPTIME_KUMA_STATUS_PAGE absent)");
  const slug = encodeURIComponent(kumaPage);
  const [page, beats] = await Promise.all([getJson(`${kuma}/api/status-page/${slug}`), getJson(`${kuma}/api/status-page/heartbeat/${slug}`)]);
  if (page === null) return unknown("S4 · Uptime Kuma (injoignable)");
  return live(parseKuma(page, beats), "S4 · Uptime Kuma");
}

/** /backups : dernier passage écrit par infrastructure/backups (schéma backup-run). */
export async function getLastBackup(): Promise<Sourced<BackupRun>> {
  const url = infraConfig().backup;
  if (!url) return unknown("S6 · journal de sauvegarde (BACKUP_STATUS_URL absent)");
  const j = (await getJson(url)) as Partial<BackupRun> | null;
  if (!j || typeof j.id !== "string" || typeof j.result !== "string") return unknown("S6 · journal de sauvegarde (illisible)");
  return live(j as BackupRun, "S6 · journal de sauvegarde");
}

export interface InfraSnapshot {
  host: Sourced<PiHost>;
  containers: Sourced<Container[]>;
  monitors: Sourced<Monitor[]>;
  backup: Sourced<BackupRun>;
  configured: { prometheus: boolean; kuma: boolean; backup: boolean };
}

export async function getInfra(): Promise<InfraSnapshot> {
  const c = infraConfig();
  const [host, containers, monitors, backup] = await Promise.all([getPiHost(), getContainers(), getMonitors(), getLastBackup()]);
  return { host, containers, monitors, backup, configured: { prometheus: Boolean(c.prometheus), kuma: Boolean(c.kuma && c.kumaPage), backup: Boolean(c.backup) } };
}
