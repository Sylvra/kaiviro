"use client";

import { useEffect, useState } from "react";
import { Activity, AppWindow, Archive, Box, Cpu, Server, Settings2, Thermometer } from "lucide-react";
import { fmtBytes, fmtDuration, hostHealth, type AppHealth, type AppStatus, type BackupRun, type Container, type Monitor, type PiHost, type Point, type Unit } from "@/lib/infra";
import { cx } from "../ui";

/** Instantané sérialisable renvoyé par /api/admin/v1/infra/snapshot. */
export interface Snap<T> { value: T | null; source: string; fetchedAt: string | null; freshness: string }
export interface InfraView {
  host: Snap<PiHost>; containers: Snap<Container[]>; monitors: Snap<Monitor[]>; backup: Snap<BackupRun>;
  services: Snap<Unit[]>; app: Snap<AppHealth>;
  configured: { prometheus: boolean; kuma: boolean; backup: boolean; app: boolean };
}

const HEALTH = {
  ok: { label: "Saine", cls: "bg-mint-bg text-mint-ink", dot: "bg-mint-dot" },
  warn: { label: "À surveiller", cls: "bg-amber-bg text-amber-ink", dot: "bg-amber-dot" },
  alert: { label: "Alerte", cls: "bg-coral-bg text-coral-ink", dot: "bg-coral-dot" },
  unknown: { label: "Non supervisée", cls: "bg-[#efebe5] text-[#5f5952]", dot: "bg-[#b9b3aa]" },
} as const;

/** Jauge circulaire : vide et « — » si la valeur est inconnue. */
function Gauge({ label, value, display, icon: Icon, warn, alert }: { label: string; value: number | null; display: string; icon: typeof Cpu; warn: number; alert: number }) {
  const r = 26, c = 2 * Math.PI * r;
  const v = value === null ? 0 : Math.max(0, Math.min(1, value));
  const color = value === null ? "#b9b3aa" : v >= alert ? "#e07a52" : v >= warn ? "#e0a100" : "#14b8a6";
  return (
    <div className="flex flex-col items-center gap-1 rounded-[14px] bg-surface-2 p-2.5" aria-label={`${label} : ${display}`}>
      <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-line" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(v * c).toFixed(1)} ${c}`} transform="rotate(-90 32 32)" style={{ transition: "stroke-dasharray .6s ease" }} />
      </svg>
      <span className="-mt-[46px] mb-[18px] text-[13px] font-bold tabular-nums">{display}</span>
      <span className="flex items-center gap-1 text-[11px] text-ink-3"><Icon size={11} aria-hidden />{label}</span>
    </div>
  );
}

/** Courbe de la dernière heure ; rien n'est tracé sans points. */
function Spark({ points, color, max }: { points: Point[]; color: string; max?: number }) {
  if (points.length < 2) return <div className="grid h-10 place-items-center text-[11px] text-ink-3">pas d’historique</div>;
  const ys = points.map((p) => p[1]);
  const top = max ?? Math.max(...ys) * 1.1;
  const bottom = max === undefined ? Math.min(...ys) * 0.9 : 0;
  const t0 = points[0]![0], t1 = points[points.length - 1]![0];
  const d = points.map(([t, y], i) => `${i ? "L" : "M"}${(((t - t0) / (t1 - t0 || 1)) * 200).toFixed(1)},${(40 - ((y - bottom) / (top - bottom || 1)) * 36).toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 200 40" className="h-10 w-full" preserveAspectRatio="none" aria-hidden>
      <path d={`${d} L200,40 L0,40 Z`} fill={color} opacity="0.12" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const UNIT_DOT: Record<Unit["state"], string> = {
  active: "bg-mint-dot", activating: "bg-sky-dot", deactivating: "bg-amber-dot", inactive: "bg-[#b9b3aa]", failed: "bg-coral-dot", unknown: "bg-[#b9b3aa]",
};
const UNIT_LABEL: Record<Unit["state"], string> = {
  active: "actif", activating: "démarrage", deactivating: "arrêt en cours", inactive: "arrêté", failed: "en échec", unknown: "inconnu",
};
const APP_DOT: Record<AppStatus, string> = { ok: "bg-mint-dot", degraded: "bg-amber-dot", down: "bg-coral-dot", unknown: "bg-[#b9b3aa]" };
const APP_LABEL: Record<AppStatus, string> = { ok: "OK", degraded: "dégradé", down: "en panne", unknown: "inconnu" };

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)} %`);
/**
 * Âge d'une mesure. Avant le montage (rendu serveur et hydratation), heure absolue en Europe/Paris :
 * Date.now() pendant le rendu donnerait un texte différent côté serveur et navigateur (erreur React 418).
 */
const ago = (iso: string | null, now: number | null) => {
  if (!iso) return "jamais";
  if (now === null) return `à ${new Date(iso).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris" })}`;
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  return s < 60 ? `il y a ${s} s` : s < 3600 ? `il y a ${Math.round(s / 60)} min` : `il y a ${Math.round(s / 3600)} h`;
};

function Section({ title, icon: Icon, source, children }: { title: string; icon: typeof Cpu; source: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        <span className="flex items-center gap-1.5"><Icon size={12} aria-hidden />{title}</span>
        <span className="truncate font-normal normal-case tracking-normal">{source}</span>
      </h3>
      {children}
    </section>
  );
}

export function PiPanel({ infra, refreshing }: { infra: InfraView; refreshing: boolean }) {
  const h = infra.host.value;
  const health = hostHealth(h);
  const nothing = !infra.configured.prometheus && !infra.configured.kuma && !infra.configured.backup;
  const containers = infra.containers.value;
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-[10px] bg-ink text-white"><Server size={16} aria-hidden /></span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[15px] font-bold">Raspberry Pi 5</span>
          <span className="text-[11px] text-ink-3">{infra.host.fetchedAt ? `Mis à jour ${ago(infra.host.fetchedAt, now)}${refreshing ? " · actualisation…" : " · toutes les 15 s"}` : "Aucune mesure reçue"}</span>
        </div>
        <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold", HEALTH[health].cls)}><span className={cx("size-1.5 rounded-full", HEALTH[health].dot)} />{HEALTH[health].label}</span>
      </div>

      {nothing && (
        <div className="flex flex-col gap-2 rounded-[14px] border border-dashed border-line p-3 text-[13px]">
          <span className="font-semibold">Brancher la supervision</span>
          <ol className="flex list-decimal flex-col gap-1.5 pl-4 text-ink-2">
            <li>Sur la Pi : Prometheus et Node Exporter (avec <code className="font-mono text-[12px]">--collector.systemd</code>) en paquets natifs, Uptime Kuma, liés à l’adresse Tailscale. Valheim n’est pas touché.</li>
            <li>Dans <code className="font-mono text-[12px]">apps/command-center/.env.local</code> : <code className="font-mono text-[12px]">PROMETHEUS_URL</code>, <code className="font-mono text-[12px]">UPTIME_KUMA_URL</code> + <code className="font-mono text-[12px]">UPTIME_KUMA_STATUS_PAGE</code>, <code className="font-mono text-[12px]">BACKUP_STATUS_URL</code> (adresses VPN de la Pi). Option : <code className="font-mono text-[12px]">PI_SYSTEMD_UNITS</code> pour choisir les services suivis.</li>
            <li>Redémarrer le serveur du Command Center : ce panneau s’allume tout seul.</li>
          </ol>
          <span className="text-xs text-ink-3">Tant que rien n’est branché, aucune valeur n’est affichée : pas de chiffre inventé.</span>
        </div>
      )}

      <Section title="Hôte" icon={Cpu} source={infra.host.source}>
        <div className="grid grid-cols-4 gap-2">
          <Gauge label="CPU" value={h?.cpu ?? null} display={pct(h?.cpu ?? null)} icon={Cpu} warn={0.85} alert={0.95} />
          <Gauge label="RAM" value={h?.mem ?? null} display={pct(h?.mem ?? null)} icon={Activity} warn={0.8} alert={0.92} />
          <Gauge label="Disque" value={h?.disk ?? null} display={pct(h?.disk ?? null)} icon={Archive} warn={0.8} alert={0.9} />
          <Gauge label="Temp." value={h?.temp == null ? null : h.temp / 90} display={h?.temp == null ? "—" : `${Math.round(h.temp)}°`} icon={Thermometer} warn={70 / 90} alert={80 / 90} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([["CPU · 1 h", h?.series.cpu ?? [], "#14b8a6", 1], ["RAM · 1 h", h?.series.mem ?? [], "#8b7cf0", 1], ["Temp. · 1 h", h?.series.temp ?? [], "#e07a52", undefined]] as const).map(([l, p, c, m]) => (
            <div key={l} className="rounded-[12px] bg-surface-2 px-2 pb-1 pt-1.5"><span className="text-[10px] text-ink-3">{l}</span><Spark points={[...p]} color={c} max={m} /></div>
          ))}
        </div>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
          <dt className="text-ink-3">Uptime</dt><dd className="text-right tabular-nums">{fmtDuration(h?.uptime ?? null)}</dd>
          <dt className="text-ink-3">Charge (1 min)</dt><dd className="text-right tabular-nums">{h?.load1 == null ? "—" : h.load1.toFixed(2)}</dd>
          <dt className="text-ink-3">Réseau ↓ / ↑</dt><dd className="text-right tabular-nums">{fmtBytes(h?.netRx ?? null)}/s · {fmtBytes(h?.netTx ?? null)}/s</dd>
          <dt className="text-ink-3">Mémoire totale</dt><dd className="text-right tabular-nums">{fmtBytes(h?.memTotal ?? null)}</dd>
        </dl>
      </Section>

      <Section title={`Services${infra.services.value ? ` · ${infra.services.value.filter((u) => u.state === "active").length}/${infra.services.value.length}` : ""}`} icon={Settings2} source={infra.services.source}>
        {!infra.services.value ? <p className="text-[12px] text-ink-3">Inconnu : collecteur systemd de Node Exporter non joignable.</p> : infra.services.value.length === 0 ? <p className="text-[12px] text-ink-3">Aucun service suivi trouvé (filtre PI_SYSTEMD_UNITS).</p> : (
          <ul className="grid grid-cols-2 gap-1.5">
            {infra.services.value.map((u) => (
              <li key={u.name} className="flex items-center gap-2 rounded-[10px] bg-surface-2 px-2.5 py-1.5 text-[12px]" title={UNIT_LABEL[u.state]}>
                <span className={cx("size-2 shrink-0 rounded-full", UNIT_DOT[u.state])} aria-label={UNIT_LABEL[u.state]} />
                <span className="min-w-0 flex-1 truncate font-mono">{u.name}</span>
                {u.state !== "active" && <span className="text-[11px] text-ink-3">{UNIT_LABEL[u.state]}</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {containers && containers.length > 0 && (
        <Section title={`Conteneurs · ${containers.filter((c) => c.up).length}/${containers.length}`} icon={Box} source={infra.containers.source}>
          <ul className="flex flex-col divide-y divide-line-soft">
            {containers.map((c) => (
              <li key={c.name} className="flex items-center gap-2 py-1.5 text-[12px]">
                <span className={cx("size-2 rounded-full", c.up ? "bg-mint-dot" : "bg-coral-dot")} aria-label={c.up ? "actif" : "arrêté"} />
                <span className="min-w-0 flex-1 truncate font-mono">{c.name}</span>
                <span className="tabular-nums text-ink-3">{c.cpu === null ? "—" : `${(c.cpu * 100).toFixed(1)} %`}</span>
                <span className="w-16 text-right tabular-nums text-ink-3">{fmtBytes(c.mem)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Application" icon={AppWindow} source={infra.app.source}>
        {!infra.app.value ? <p className="text-[12px] text-ink-3">Inconnu : backend non déployé ou /health/details injoignable.</p> : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 rounded-[10px] bg-surface-2 px-2.5 py-1.5 text-[12px]">
              <span className={cx("size-2 rounded-full", APP_DOT[infra.app.value.status])} />
              <span className="flex-1 font-mono">{infra.app.value.service}{infra.app.value.version ? ` · ${infra.app.value.version}` : ""}</span>
              <span className="font-semibold">{APP_LABEL[infra.app.value.status]}</span>
            </div>
            {infra.app.value.dependencies.map((d) => (
              <div key={d.name} className="flex items-center gap-2 px-2.5 py-1 text-[12px]">
                <span className={cx("size-1.5 rounded-full", APP_DOT[d.status])} />
                <span className="min-w-0 flex-1 truncate font-mono text-ink-2">{d.name}</span>
                <span className="tabular-nums text-ink-3">{d.latencyMs === null ? "—" : `${Math.round(d.latencyMs)} ms`}</span>
                <span className="w-16 text-right text-ink-3">{APP_LABEL[d.status]}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Disponibilité" icon={Activity} source={infra.monitors.source}>
        {!infra.monitors.value ? <p className="text-[12px] text-ink-3">Inconnu : Uptime Kuma non joignable.</p> : (
          <ul className="flex flex-col gap-1">
            {infra.monitors.value.map((m) => (
              <li key={m.name} className="flex items-center gap-2 rounded-[10px] bg-surface-2 px-2.5 py-1.5 text-[12px]">
                <span className={cx("size-2 rounded-full", m.up === null ? "bg-[#b9b3aa]" : m.up ? "bg-mint-dot" : "bg-coral-dot")} />
                <span className="min-w-0 flex-1 truncate">{m.name}</span>
                <span className="tabular-nums text-ink-3">{m.uptime24 === null ? "—" : `${(m.uptime24 * 100).toFixed(2)} %`}</span>
                <span className="w-14 text-right tabular-nums text-ink-3">{m.ping === null ? "—" : `${m.ping} ms`}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Sauvegarde" icon={Archive} source={infra.backup.source}>
        {!infra.backup.value ? <p className="text-[12px] text-ink-3">Inconnu : aucun journal de sauvegarde lu.</p> : (
          <div className="flex items-center gap-2 rounded-[12px] bg-surface-2 px-3 py-2 text-[12px]">
            <span className={cx("size-2 rounded-full", infra.backup.value.result === "succeeded" ? "bg-mint-dot" : infra.backup.value.result === "partial" ? "bg-amber-dot" : infra.backup.value.result === "failed" ? "bg-coral-dot" : "bg-sky-dot")} />
            <span className="flex-1">{infra.backup.value.kind === "restore_test" ? "Test de restauration" : "Sauvegarde"} {infra.backup.value.scope} · {infra.backup.value.result}</span>
            <span className="text-ink-3">{ago(infra.backup.value.finished_at, now)}</span>
          </div>
        )}
      </Section>
    </div>
  );
}
