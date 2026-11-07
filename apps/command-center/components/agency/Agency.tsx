"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Box, LayoutGrid, ScrollText, X } from "lucide-react";
import type { AgencyModel, ZoneId, ZoneState } from "@/lib/agency";
import type { LogEntry } from "@/lib/activity";
import { cx } from "../ui";

// Code 3D dans un paquet séparé, chargé seulement sur /agency (COMMAND_CENTER_3D §2.4).
const AgencyScene = dynamic(() => import("./AgencyScene"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-ink-3">Chargement de la scène 3D…</div>,
});

const STATE: Record<ZoneState, { label: string; dot: string; chip: string }> = {
  ok: { label: "OK", dot: "bg-mint-dot", chip: "bg-mint-bg text-mint-ink" },
  warn: { label: "Attention", dot: "bg-amber-dot", chip: "bg-amber-bg text-amber-ink" },
  alert: { label: "Alerte", dot: "bg-coral-dot", chip: "bg-coral-bg text-coral-ink" },
  unknown: { label: "Inconnu", dot: "bg-[#b9b3aa]", chip: "bg-[#efebe5] text-[#5f5952]" },
};

const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
function ago(iso: string): string {
  let v = (Date.parse(iso) - Date.now()) / 1000;
  for (const [n, u] of [[60, "second"], [60, "minute"], [24, "hour"], [7, "day"], [4.35, "week"], [12, "month"]] as [number, Intl.RelativeTimeFormatUnit][]) {
    if (Math.abs(v) < n) return rtf.format(Math.round(v), u);
    v /= n;
  }
  return rtf.format(Math.round(v), "year");
}

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

const PREF = "kaiviro.agency3d";

export function Agency({ model, log, logSource }: { model: AgencyModel; log: LogEntry[] | null; logSource: string }) {
  const [selected, setSelected] = useState<ZoneId | null>(null);
  const [tab, setTab] = useState<"zone" | "journal">("zone");
  const [gl, setGl] = useState<"checking" | "ok" | "none">("checking");
  const [enabled, setEnabled] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [lowPower, setLowPower] = useState(false);
  const zone = useMemo(() => model.zones.find((z) => z.id === selected) ?? null, [model.zones, selected]);
  const counts = useMemo(() => {
    const c: Record<ZoneState, number> = { ok: 0, warn: 0, alert: 0, unknown: 0 };
    model.zones.forEach((z) => { c[z.state]++; });
    return c;
  }, [model.zones]);

  useEffect(() => {
    setGl(webglAvailable() ? "ok" : "none");
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    const small = window.innerWidth < 768;
    setLowPower(small || (navigator.hardwareConcurrency ?? 8) <= 4);
    // Préférence de l'utilisateur ; désactivée par défaut sur mobile (§2.2).
    let saved: string | null = null;
    try { saved = window.localStorage.getItem(PREF); } catch { /* stockage indisponible */ }
    setEnabled(saved === null ? !small : saved === "on");
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function toggle3d() {
    setEnabled((v) => {
      try { window.localStorage.setItem(PREF, v ? "off" : "on"); } catch { /* stockage indisponible */ }
      return !v;
    });
  }

  function select(id: ZoneId) {
    setSelected((cur) => (cur === id ? null : id));
    setTab("zone");
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function listKey(e: React.KeyboardEvent<HTMLUListElement>) {
    if (!["ArrowDown", "ArrowUp"].includes(e.key)) return;
    e.preventDefault();
    const i = model.zones.findIndex((z) => z.id === selected);
    const next = model.zones[(i + (e.key === "ArrowDown" ? 1 : -1) + model.zones.length) % model.zones.length]!;
    setSelected(next.id);
    setTab("zone");
    (e.currentTarget.querySelector(`[data-zone="${next.id}"]`) as HTMLElement | null)?.focus();
  }

  const show3d = enabled && gl === "ok";

  return (
    <section aria-label="Agence virtuelle" className="flex min-h-[calc(100dvh-28px)] flex-col gap-3 p-4">
      <header className="flex flex-wrap items-center gap-3">
        <span className="grid size-10 place-items-center rounded-[12px] bg-ink text-white"><Box size={18} aria-hidden /></span>
        <div className="flex min-w-[200px] flex-1 flex-col">
          <h1 className="text-[22px] font-bold leading-tight tracking-[-0.02em]">Agence KAIVIRO</h1>
          <span className="text-xs text-ink-3">Vue 3D sur les données réelles · un voyant gris signifie « aucune source », jamais « tout va bien »</span>
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label="Synthèse des zones">
          {(["alert", "warn", "ok", "unknown"] as ZoneState[]).map((s) => (
            <span key={s} className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", STATE[s].chip)}>
              <span className={cx("size-2 rounded-full", STATE[s].dot)} />{counts[s]} {STATE[s].label.toLowerCase()}
            </span>
          ))}
        </div>
        <button type="button" onClick={toggle3d} aria-pressed={enabled} disabled={gl === "none"}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#e5dfd6] bg-white px-3 text-[13px] font-semibold disabled:opacity-50">
          {enabled ? <LayoutGrid size={14} aria-hidden /> : <Box size={14} aria-hidden />}{enabled ? "Plan 2D" : "Vue 3D"}
        </button>
      </header>

      {/* Scène en pleine largeur au-dessus ; sur très grand écran : liste | scène | détails. */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-[230px_minmax(0,1fr)_340px]">
        {/* Liste textuelle accessible des zones (§2.6), toujours présente */}
        <nav aria-label="Zones de l’agence" className="order-2 flex flex-col gap-1 rounded-[var(--radius-panel)] border border-line bg-surface-2 p-2 2xl:order-1">
          <span className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">Zones · ↑ ↓ pour naviguer</span>
          <ul onKeyDown={listKey} className="flex flex-col gap-0.5">
            {model.zones.map((z) => (
              <li key={z.id}>
                <button type="button" data-zone={z.id} aria-pressed={selected === z.id} onClick={() => select(z.id)}
                  className={cx("flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-[13px] transition-colors", selected === z.id ? "bg-white font-semibold shadow-[var(--shadow-card)]" : "hover:bg-white/60")}>
                  <span className={cx("size-2.5 shrink-0 rounded-full", STATE[z.state].dot)} aria-hidden />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{z.label}</span>
                    <span className="truncate text-[11px] font-normal text-ink-3">{z.summary}</span>
                  </span>
                  <span className="sr-only">État : {STATE[z.state].label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="relative order-1 h-[min(68vh,640px)] min-h-[420px] overflow-hidden rounded-[var(--radius-panel)] border border-line bg-[#fbf9f5] md:col-span-2 2xl:order-2 2xl:col-span-1 2xl:h-auto">
          {show3d ? (
            <>
              <AgencyScene model={model} selected={selected} onSelect={select} reducedMotion={reducedMotion} lowPower={lowPower} />
              <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2 text-[11px] text-ink-3">
                <span className="rounded-full bg-white/90 px-2 py-1">Glisser : tourner · Molette : zoom · Clic droit : déplacer · Échap : recentrer</span>
                {reducedMotion && <span className="rounded-full bg-white/90 px-2 py-1">Mouvements réduits</span>}
              </div>
            </>
          ) : (
            // Repli sans WebGL ou 3D coupée : plan 2D cliquable équivalent (§2.5).
            <div className="flex h-full flex-col gap-3 p-4">
              {gl === "none" && <p role="status" className="rounded-xl border border-[#f3e2b3] bg-[#fff6de] px-3 py-2 text-[13px] text-amber-ink">WebGL indisponible sur ce navigateur : plan 2D affiché à la place.</p>}
              {gl === "checking" ? <p className="text-sm text-ink-3">Vérification de la 3D…</p> : (
                <div className="grid flex-1 gap-3 [grid-template-columns:repeat(auto-fill,minmax(180px,1fr))]">
                  {model.zones.map((z) => (
                    <button key={z.id} type="button" onClick={() => select(z.id)} aria-pressed={selected === z.id}
                      className={cx("flex flex-col gap-1.5 rounded-[16px] border bg-white p-3 text-left", selected === z.id ? "border-accent" : "border-line-soft")}>
                      <span className="flex items-center gap-2 text-sm font-semibold"><span className={cx("size-2.5 rounded-full", STATE[z.state].dot)} />{z.label}</span>
                      <span className="text-xs text-ink-3">{z.summary}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <aside aria-label="Détails" className="order-3 flex max-h-[640px] min-h-[320px] flex-col rounded-[var(--radius-panel)] border border-line bg-white">
          <div role="tablist" className="flex gap-1 border-b border-line-soft p-1.5">
            {([["zone", "Zone", Box], ["journal", `Journal${log ? ` · ${log.length}` : ""}`, ScrollText]] as const).map(([id, label, Icon]) => (
              <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)}
                className={cx("inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold", tab === id ? "bg-ink text-white" : "text-ink-3 hover:bg-surface-2")}>
                <Icon size={14} aria-hidden />{label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {tab === "zone" && !zone && (
              <div className="flex flex-col gap-2 text-[13px] text-ink-3">
                <p>Clique une zone dans la scène ou dans la liste pour voir son état, ses chiffres et sa source.</p>
                <p>Les blocs, balises et sphères sont tous des éléments réels : survole-les pour leur nom.</p>
              </div>
            )}
            {tab === "zone" && zone && (
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <span className={cx("inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold", STATE[zone.state].chip)}><span className={cx("size-1.5 rounded-full", STATE[zone.state].dot)} />{STATE[zone.state].label}</span>
                    <h2 className="text-lg font-bold">{zone.label}</h2>
                  </div>
                  <button type="button" onClick={() => setSelected(null)} aria-label="Fermer la zone" className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-surface-2"><X size={15} /></button>
                </div>
                <p className="text-[14px] font-semibold">{zone.summary}</p>
                {zone.details.length > 0 && <ul className="flex flex-col gap-1.5 text-[13px] text-ink-2">{zone.details.map((x) => <li key={x} className="rounded-lg bg-surface-2 px-2.5 py-1.5">{x}</li>)}</ul>}
                <span className="text-xs text-ink-3">Source : {zone.source}</span>
                <Link href={zone.href} className="inline-flex h-9 w-fit items-center gap-1.5 rounded-xl bg-accent px-3.5 text-[13px] font-semibold text-white hover:bg-accent-hover">Ouvrir la vue détaillée <ArrowUpRight size={14} aria-hidden /></Link>
              </div>
            )}
            {tab === "journal" && (
              <div className="flex flex-col gap-2">
                <span className="text-xs text-ink-3">Source : {logSource}</span>
                {log === null && <p className="text-[13px] text-ink-3">Journal indisponible : ni GitHub ni le fichier local n’ont répondu.</p>}
                {log?.length === 0 && <p className="text-[13px] text-ink-3">Aucune activité récente.</p>}
                <ol className="flex flex-col gap-2">
                  {log?.map((e) => {
                    const body = (
                      <>
                        <span className="flex items-center gap-1.5 text-[11px]">
                          <span className={cx("rounded px-1.5 py-px font-semibold", e.source === "GitHub" ? "bg-lav-bg text-lav-ink" : "bg-sky-bg text-sky-ink")}>{e.kind}</span>
                          <span className="font-semibold text-ink-2">{e.actor}</span>
                          <span className="ml-auto text-ink-3">{ago(e.at)}</span>
                        </span>
                        <span className="line-clamp-2 text-[13px] text-ink">{e.text}</span>
                      </>
                    );
                    return (
                      <li key={e.id}>
                        {e.url
                          ? <a href={e.url} target="_blank" rel="noreferrer" className="flex flex-col gap-1 rounded-[12px] border border-line-soft p-2.5 hover:border-ink/20">{body}</a>
                          : <div className="flex flex-col gap-1 rounded-[12px] border border-line-soft p-2.5">{body}</div>}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
