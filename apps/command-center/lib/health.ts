import { appHealthState, hostHealth, type AppHealth, type BackupRun, type Health, type Monitor, type PiHost, type Unit } from "./infra";
import type { CiRun } from "./ci";

/**
 * Tuiles de santé de l'aperçu Opérations, calculées sur les mêmes instantanés que le panneau Raspberry.
 * Sans mesure : « unknown » et « — ». Un moniteur ou une dépendance introuvable reste inconnu, jamais « OK ».
 */
export interface HealthTile { label: string; state: Health; value: string; source: string; live: boolean }

interface S<T> { value: T | null; source: string; freshness: string }

export interface HealthInput {
  host: S<PiHost>; services: S<Unit[]>; monitors: S<Monitor[]>; app: S<AppHealth>; backup: S<BackupRun>; ci: S<CiRun[]>;
}

const monitorTile = (label: string, m: S<Monitor[]>, re: RegExp): HealthTile => {
  const hit = m.value?.find((x) => re.test(x.name));
  if (!hit || hit.up === null) return { label, state: "unknown", value: "—", source: m.value ? `${m.source} · aucun moniteur « ${re.source} »` : m.source, live: false };
  return { label, state: hit.up ? "ok" : "alert", value: hit.up ? (hit.ping === null ? "en ligne" : `${hit.ping} ms`) : "hors ligne", source: m.source, live: true };
};

export function healthTiles(d: HealthInput): HealthTile[] {
  const app = d.app.value;
  const db = app?.dependencies.find((x) => /^(database|db|postgres|supabase)/.test(x.name));
  const h = d.host.value;
  const units = d.services.value;
  const failed = units?.filter((u) => u.state === "failed").length ?? 0;
  const active = units?.filter((u) => u.state === "active").length ?? 0;
  const ci = d.ci.value;
  const red = ci?.filter((r) => r.state === "failure").length ?? 0;
  const b = d.backup.value;

  return [
    app
      ? { label: "API applicative", state: appHealthState(app), value: { ok: "OK", degraded: "dégradée", down: "en panne", unknown: "—" }[app.status], source: d.app.source, live: true }
      : { label: "API applicative", state: "unknown", value: "—", source: d.app.source, live: false },
    db
      ? { label: "Base de données", state: appHealthState({ ...app!, status: db.status }), value: db.latencyMs === null ? db.status : `${Math.round(db.latencyMs)} ms`, source: d.app.source, live: true }
      : { label: "Base de données", state: "unknown", value: "—", source: d.app.source, live: false },
    monitorTile("Command Center", d.monitors, /command/i),
    { label: "Raspberry Pi", state: hostHealth(h), value: h?.cpu == null ? "—" : `CPU ${Math.round(h.cpu * 100)} %${h.temp == null ? "" : ` · ${Math.round(h.temp)} °C`}`, source: d.host.source, live: Boolean(h) },
    { label: "Stockage", state: h?.disk == null ? "unknown" : h.disk >= 0.9 ? "alert" : h.disk >= 0.8 ? "warn" : "ok", value: h?.disk == null ? "—" : `${Math.round(h.disk * 100)} % utilisé`, source: d.host.source, live: h?.disk != null },
    monitorTile("VPN admin", d.monitors, /vpn|tailscale|wireguard/i),
    units && units.length
      ? { label: "Services Pi", state: failed ? "alert" : active === units.length ? "ok" : "warn", value: `${active}/${units.length} actifs`, source: d.services.source, live: true }
      : { label: "Services Pi", state: "unknown", value: "—", source: d.services.source, live: false },
    ci
      ? { label: "CI", state: ci.length === 0 ? "unknown" : red ? "alert" : "ok", value: ci.length === 0 ? "aucune exécution" : red ? `${red} en échec` : "verte", source: d.ci.source, live: true }
      : { label: "CI", state: "unknown", value: "—", source: d.ci.source, live: false },
    b
      ? { label: "Dernière sauvegarde", state: b.result === "succeeded" ? "ok" : b.result === "running" ? "unknown" : b.result === "partial" ? "warn" : "alert", value: `${b.result} · ${b.finished_at.slice(0, 10)}`, source: d.backup.source, live: true }
      : { label: "Dernière sauvegarde", state: "unknown", value: "—", source: d.backup.source, live: false },
  ];
}
