"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Box, Crosshair, LayoutGrid, List, Maximize2, Minimize2, Moon, PanelRight, ScrollText, Server, Sun, X } from "lucide-react";
import type { AgencyModel, Tone, Zone, ZoneId, ZoneState } from "@/lib/agency";
import type { LogEntry } from "@/lib/activity";
import { hostHealth } from "@/lib/infra";
import { PiPanel, type InfraView } from "./PiPanel";
import { cx } from "../ui";

// Code 3D dans un paquet séparé, chargé seulement sur /agency (COMMAND_CENTER_3D §2.4).
const AgencyScene = dynamic(() => import("./AgencyScene"), {
  ssr: false,
  loading: () => <SceneSkeleton />,
});

const STATE: Record<ZoneState, { label: string; dot: string; chip: string }> = {
  ok: { label: "OK", dot: "bg-mint-dot", chip: "bg-mint-bg text-mint-ink" },
  warn: { label: "Attention", dot: "bg-amber-dot", chip: "bg-amber-bg text-amber-ink" },
  alert: { label: "Alerte", dot: "bg-coral-dot", chip: "bg-coral-bg text-coral-ink" },
  unknown: { label: "Inconnu", dot: "bg-[#b9b3aa]", chip: "agency-chip-unknown" },
};
const TONE_DOT: Record<Tone, string> = { mint: "bg-mint-dot", amber: "bg-amber-dot", lav: "bg-lav-dot", coral: "bg-coral-dot", sky: "bg-sky-dot", neutral: "bg-[#cfc8bd]" };
const ORDER: ZoneState[] = ["alert", "warn", "ok", "unknown"];

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
const THEME = "kaiviro.theme";
const EASE = [0.22, 1, 0.36, 1] as const;

function SceneSkeleton() {
  return (
    <div className="grid h-full place-items-center">
      <div className="flex flex-col items-center gap-3 text-sm text-ink-3">
        <div className="size-10 animate-pulse rounded-xl bg-line" aria-hidden />
        Chargement de la maquette…
      </div>
    </div>
  );
}

/** Bouton de barre d'outils : même forme partout, état pressé lisible sans couleur seule. */
function ToolButton({ pressed, onClick, label, children, disabled, primary, shortcut }: {
  pressed?: boolean; onClick: () => void; label: string; children: React.ReactNode; disabled?: boolean; primary?: boolean; shortcut?: string;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={pressed} disabled={disabled} title={shortcut ? `${label} (${shortcut})` : label} aria-keyshortcuts={shortcut}
      className={cx("inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold transition-colors duration-150 disabled:opacity-45",
        primary ? "bg-accent text-white hover:bg-accent-hover" : pressed ? "bg-surface-2 text-ink shadow-[inset_0_0_0_1px_var(--color-line)]" : "text-ink-2 hover:bg-surface-2")}>
      {children}
    </button>
  );
}

function Breakdown({ segments }: { segments: Zone["breakdown"] }) {
  const total = segments.reduce((s, x) => s + x.count, 0);
  if (segments.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-line" role="img"
        aria-label={total === 0 ? "Aucun élément" : segments.map((s) => `${s.label} : ${s.count}`).join(", ")}>
        {total > 0 && segments.filter((s) => s.count > 0).map((s) => (
          <span key={s.label} className={cx("h-full", TONE_DOT[s.tone])} style={{ width: `${(s.count / total) * 100}%` }} />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px]">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5 text-ink-2">
            <span className={cx("size-2 shrink-0 rounded-full", TONE_DOT[s.tone])} aria-hidden />
            <span className="truncate">{s.label}</span>
            <span className="ml-auto font-semibold tabular-nums text-ink">{s.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ZoneDetail({ zone, onClose }: { zone: Zone; onClose: () => void }) {
  const unknown = zone.state === "unknown";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1.5">
          <span className={cx("inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold", STATE[zone.state].chip)}>
            <span className={cx("size-1.5 rounded-full", STATE[zone.state].dot)} aria-hidden />{STATE[zone.state].label}
          </span>
          <h2 className="text-[20px] font-bold leading-tight tracking-[-0.01em] [text-wrap:balance]">{zone.label}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer la zone" className="grid size-8 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"><X size={16} /></button>
      </div>

      <p className="text-[14px] font-semibold leading-snug text-ink">{zone.summary}</p>

      {zone.kpis.length > 0 && (
        <dl className="grid grid-cols-3 gap-2">
          {zone.kpis.map((k) => (
            <div key={k.label} className="flex flex-col gap-0.5 rounded-xl bg-surface-2 px-2.5 py-2">
              <dd className="text-[19px] font-bold leading-none tabular-nums text-ink">{k.value}</dd>
              <dt className="text-[11px] leading-tight text-ink-3">{k.label}</dt>
            </div>
          ))}
        </dl>
      )}

      {unknown && zone.kpis.length === 0 && (
        <p className="rounded-xl border border-dashed border-line px-3 py-2.5 text-[13px] text-ink-3">
          Aucune mesure : rien n’est affiché tant que la source ne répond pas. Un gris n’est jamais un « tout va bien ».
        </p>
      )}

      <Breakdown segments={zone.breakdown} />

      {zone.details.length > 0 && (
        <ul className="flex flex-col divide-y divide-line-soft rounded-xl border border-line-soft text-[13px] text-ink-2">
          {zone.details.map((x) => <li key={x} className="px-3 py-2">{x}</li>)}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-3">
        <span className="text-[12px] text-ink-3">Source : {zone.source}</span>
        <Link href={zone.href} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-accent-hover">
          Vue détaillée <ArrowUpRight size={14} aria-hidden />
        </Link>
      </div>
    </div>
  );
}

function Overview({ model, onSelect }: { model: AgencyModel; onSelect: (id: ZoneId) => void }) {
  const attention = model.zones.filter((z) => z.state === "alert" || z.state === "warn");
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-[20px] font-bold leading-tight tracking-[-0.01em]">Vue d’ensemble</h2>
        <p className="text-[13px] text-ink-3">Choisis une zone sur la maquette ou dans la liste. La caméra s’y pose et ses chiffres s’affichent ici.</p>
      </div>
      {attention.length > 0 ? (
        <section aria-label="À regarder" className="flex flex-col gap-2">
          <h3 className="text-[13px] font-semibold text-ink-2">À regarder</h3>
          <ul className="flex flex-col gap-1.5">
            {attention.map((z) => (
              <li key={z.id}>
                <button type="button" onClick={() => onSelect(z.id)} className="flex w-full items-center gap-2.5 rounded-xl border border-line-soft px-3 py-2 text-left transition-colors hover:bg-surface-2">
                  <span className={cx("size-2.5 shrink-0 rounded-full", STATE[z.state].dot)} aria-hidden />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[13px] font-semibold">{z.label}</span>
                    <span className="truncate text-[12px] text-ink-3">{z.summary}</span>
                  </span>
                  <ArrowUpRight size={14} className="text-ink-3" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="rounded-xl bg-mint-bg px-3 py-2.5 text-[13px] text-mint-ink">Aucune zone mesurée en attention.</p>
      )}
      <section aria-label="Légende" className="flex flex-col gap-2 border-t border-line-soft pt-3 text-[12px] text-ink-3">
        <h3 className="text-[13px] font-semibold text-ink-2">Lire la maquette</h3>
        <p>Voyant et chant de parcelle : état de la zone. Fenêtres allumées : la zone a une mesure réelle.</p>
        <p>Tours : un bloc par livrable. Balises : une par décision. Sphères : une par partenaire. Livres : une ADR chacun.</p>
      </section>
    </div>
  );
}

export function Agency({ model, log, logSource, infra: initialInfra }: { model: AgencyModel; log: LogEntry[] | null; logSource: string; infra: InfraView }) {
  const [selected, setSelected] = useState<ZoneId | null>(null);
  const [tab, setTab] = useState<"zone" | "pi" | "journal">("zone");
  const [theme, setTheme] = useState<"ivoire" | "nuit">("ivoire");
  const [infra, setInfra] = useState(initialInfra);
  const [refreshing, setRefreshing] = useState(false);
  const [gl, setGl] = useState<"checking" | "ok" | "none">("checking");
  const [enabled, setEnabled] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [lowPower, setLowPower] = useState(false);
  const [viewKey, setViewKey] = useState(0);
  // Panneaux latéraux seulement à partir de md : en dessous, le panneau est une feuille en bas d'écran.
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const [showZones, setShowZones] = useState(true);
  const [showPanel, setShowPanel] = useState(true);
  const root = useRef<HTMLElement>(null);
  // Infobulle unique : texte fourni par la scène, position mise à jour sans re-rendu React.
  const [tip, setTip] = useState<string | null>(null);
  const tipEl = useRef<HTMLDivElement>(null);
  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const el = tipEl.current;
    const box = root.current?.getBoundingClientRect();
    if (!el || !box) return;
    el.style.transform = `translate(${e.clientX - box.left + 14}px, ${e.clientY - box.top + 16}px)`;
  }, []);
  const [full, setFull] = useState(false);
  const [pseudo, setPseudo] = useState(false);
  const isFull = full || pseudo;
  const anyInfra = infra.configured.prometheus || infra.configured.kuma || infra.configured.backup || infra.configured.app;
  const zone = useMemo(() => model.zones.find((z) => z.id === selected) ?? null, [model.zones, selected]);
  const counts = useMemo(() => {
    const c: Record<ZoneState, number> = { ok: 0, warn: 0, alert: 0, unknown: 0 };
    model.zones.forEach((z) => { c[z.state]++; });
    return c;
  }, [model.zones]);

  // Supervision de la Pi relue toutes les 15 s (seulement si une source est configurée et l'onglet visible).
  useEffect(() => {
    if (!anyInfra) return;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      setRefreshing(true);
      const r = await fetch("/api/admin/v1/infra/snapshot").catch(() => null);
      if (r?.ok) setInfra((await r.json()) as InfraView);
      setRefreshing(false);
    };
    const id = window.setInterval(() => void tick(), 15_000);
    return () => window.clearInterval(id);
  }, [anyInfra]);

  useEffect(() => {
    setGl(webglAvailable() ? "ok" : "none");
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    const small = window.innerWidth < 768;
    setLowPower(small || (navigator.hardwareConcurrency ?? 8) <= 4);
    setShowZones(window.innerWidth >= 1680);
    setShowPanel(window.innerWidth >= 1100);
    // Préférences : 3D désactivée par défaut sur mobile (§2.2), thème mémorisé.
    try {
      const saved = window.localStorage.getItem(PREF);
      setEnabled(saved === null ? !small : saved === "on");
      const t = window.localStorage.getItem(THEME);
      if (t === "nuit" || t === "ivoire") setTheme(t);
    } catch {
      setEnabled(!small);
    }
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const store = (k: string, v: string) => { try { window.localStorage.setItem(k, v); } catch { /* stockage indisponible */ } };
  const chooseTheme = (t: "ivoire" | "nuit") => { setTheme(t); store(THEME, t); };
  const choose3d = (on: boolean) => { setEnabled(on); store(PREF, on ? "on" : "off"); };

  const select = useCallback((id: ZoneId) => {
    setSelected((cur) => (cur === id ? null : id));
    setTab(id === "infra" ? "pi" : "zone");
    setShowPanel(true);
  }, []);
  const clear = useCallback(() => setSelected(null), []);
  const recenter = useCallback(() => { setSelected(null); setViewKey((k) => k + 1); }, []);

  const toggleFull = useCallback(async () => {
    if (document.fullscreenElement) { await document.exitFullscreen().catch(() => undefined); return; }
    if (pseudo) { setPseudo(false); return; }
    try { await root.current?.requestFullscreen(); } catch { setPseudo(true); }
  }, [pseudo]);

  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement === root.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!pseudo) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [pseudo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName));
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape") {
        if (pseudo) setPseudo(false); else setSelected(null);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault(); void toggleFull();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault(); recenter();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pseudo, toggleFull, recenter]);

  function listKey(e: React.KeyboardEvent<HTMLUListElement>) {
    if (!["ArrowDown", "ArrowUp"].includes(e.key)) return;
    e.preventDefault();
    const i = model.zones.findIndex((z) => z.id === selected);
    const next = model.zones[(i + (e.key === "ArrowDown" ? 1 : -1) + model.zones.length) % model.zones.length]!;
    setSelected(next.id);
    setTab(next.id === "infra" ? "pi" : "zone");
    (e.currentTarget.querySelector(`[data-zone="${next.id}"]`) as HTMLElement | null)?.focus();
  }

  const show3d = enabled && gl === "ok";
  const panelMotion = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 } }
    : { initial: { opacity: 0, x: 16 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 16 }, transition: { duration: 0.22, ease: EASE } };

  return (
    <section ref={root} aria-label="Agence virtuelle" data-theme={theme} onPointerMove={tip ? onPointerMove : undefined}
      className={cx("agency relative isolate overflow-hidden text-ink", isFull ? "fixed inset-0 z-50" : "h-[calc(100dvh-30px)] min-h-[600px] rounded-[inherit]")}>
      <div aria-hidden className="agency-backdrop absolute inset-0 -z-10" />

      {/* Maquette 3D, ou plan 2D équivalent (§2.5). Contexte d'empilement propre : les étiquettes 3D restent sous les panneaux. */}
      <div className="absolute inset-0 isolate z-0">
        {show3d ? (
          <AgencyScene model={model} selected={selected} onSelect={select} onClear={clear} reducedMotion={reducedMotion} lowPower={lowPower} theme={theme} viewKey={viewKey} onTip={setTip}
            inset={{ left: showZones && wide ? 256 : 0, right: showPanel && wide ? 356 : 0 }}
            pi={{ health: hostHealth(infra.host.value), temp: infra.host.value?.temp ?? null, containers: infra.containers.value?.map((c) => ({ name: c.name, up: c.up })) ?? null }} />
        ) : (
          <div className="h-full overflow-y-auto px-4 pb-6 pt-[138px] sm:pt-[92px] md:pl-[264px] lg:pr-[364px]">
            {gl === "none" && <p role="status" className="mb-3 rounded-xl bg-amber-bg px-3 py-2 text-[13px] text-amber-ink">WebGL indisponible sur ce navigateur : plan 2D affiché à la place.</p>}
            {gl === "checking" ? <SceneSkeleton /> : (
              <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
                {model.zones.map((z) => (
                  <li key={z.id}>
                    <button type="button" onClick={() => select(z.id)} aria-pressed={selected === z.id}
                      className={cx("agency-hud flex h-full w-full flex-col gap-2 rounded-2xl p-3.5 text-left transition-shadow", selected === z.id && "ring-2 ring-accent")}>
                      <span className="flex items-center gap-2 text-[14px] font-semibold"><span className={cx("size-2.5 rounded-full", STATE[z.state].dot)} aria-hidden />{z.label}<span className="sr-only">, état : {STATE[z.state].label}</span></span>
                      <span className="text-[12px] text-ink-3">{z.summary}</span>
                      {z.kpis[0] && <span className="mt-auto text-[18px] font-bold tabular-nums">{z.kpis[0].value} <span className="text-[11px] font-normal text-ink-3">{z.kpis[0].label}</span></span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* En-tête : identité + synthèse à gauche, outils à droite */}
      <header className="pointer-events-none absolute inset-x-3 top-3 z-20 flex flex-wrap items-start gap-2">
        <div className="agency-hud pointer-events-auto flex w-full items-center gap-3 rounded-2xl py-2 pl-2 pr-3.5 sm:w-auto">
          <span className="grid size-10 place-items-center rounded-xl bg-ink text-[var(--agency-on-ink)]"><Box size={18} aria-hidden /></span>
          <div className="flex flex-col gap-1">
            <h1 className="text-[17px] font-bold leading-none tracking-[-0.01em]">Agence KAIVIRO</h1>
            <ul aria-label="Synthèse des zones" className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-ink-3">
              {ORDER.map((s) => (
                <li key={s} className="inline-flex items-center gap-1.5">
                  <span className={cx("size-2 rounded-full", STATE[s].dot)} aria-hidden />
                  <span className="font-semibold tabular-nums text-ink">{counts[s]}</span> {STATE[s].label.toLowerCase()}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="agency-hud pointer-events-auto flex w-full flex-nowrap items-center gap-1 overflow-x-auto rounded-2xl p-1.5 [scrollbar-width:none] sm:ml-auto sm:w-auto" role="toolbar" aria-label="Affichage">
          <ToolButton onClick={() => setShowZones((v) => !v)} pressed={showZones} label="Liste des zones"><List size={15} aria-hidden /><span className="hidden sm:inline">Zones</span></ToolButton>
          <span className="mx-0.5 h-5 w-px bg-line" aria-hidden />
          <div role="group" aria-label="Thème" className="flex gap-0.5">
            <ToolButton onClick={() => chooseTheme("ivoire")} pressed={theme === "ivoire"} label="Thème Ivoire"><Sun size={15} aria-hidden /><span className="hidden lg:inline">Ivoire</span></ToolButton>
            <ToolButton onClick={() => chooseTheme("nuit")} pressed={theme === "nuit"} label="Thème Nuit"><Moon size={15} aria-hidden /><span className="hidden lg:inline">Nuit</span></ToolButton>
          </div>
          <span className="mx-0.5 h-5 w-px bg-line" aria-hidden />
          <div role="group" aria-label="Vue" className="flex gap-0.5">
            <ToolButton onClick={() => choose3d(true)} pressed={enabled} disabled={gl === "none"} label="Maquette 3D"><Box size={15} aria-hidden /><span className="hidden lg:inline">3D</span></ToolButton>
            <ToolButton onClick={() => choose3d(false)} pressed={!enabled} label="Plan 2D"><LayoutGrid size={15} aria-hidden /><span className="hidden lg:inline">Plan</span></ToolButton>
          </div>
          {show3d && <ToolButton onClick={recenter} label="Recentrer la vue" shortcut="R"><Crosshair size={15} aria-hidden /></ToolButton>}
          <ToolButton onClick={() => setShowPanel((v) => !v)} pressed={showPanel} label="Panneau de détails"><PanelRight size={15} aria-hidden /></ToolButton>
          <ToolButton onClick={() => void toggleFull()} pressed={isFull} label={isFull ? "Quitter le plein écran" : "Plein écran"} shortcut="F" primary>
            {isFull ? <Minimize2 size={15} aria-hidden /> : <Maximize2 size={15} aria-hidden />}<span className="hidden sm:inline">{isFull ? "Quitter" : "Plein écran"}</span>
          </ToolButton>
        </div>
      </header>

      {/* Liste accessible des zones (§2.6), toujours disponible */}
      <AnimatePresence initial={false}>
        {showZones && (
          <motion.nav key="zones" aria-label="Zones de l’agence" {...panelMotion} initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -16 }} exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
            className="agency-hud absolute bottom-3 left-3 top-[130px] z-10 flex w-[240px] sm:top-[84px] max-w-[calc(100%-24px)] flex-col rounded-2xl">
            <div className="flex items-center justify-between px-3.5 pb-1 pt-3">
              <h2 className="text-[13px] font-semibold">Zones</h2>
              <span className="text-[11px] text-ink-3">↑ ↓ pour naviguer</span>
            </div>
            <ul onKeyDown={listKey} className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-1.5">
              {model.zones.map((z) => (
                <li key={z.id}>
                  <button type="button" data-zone={z.id} aria-pressed={selected === z.id} onClick={() => select(z.id)}
                    className={cx("flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors duration-150",
                      selected === z.id ? "bg-accent text-white" : "hover:bg-surface-2")}>
                    <span className={cx("size-2.5 shrink-0 rounded-full ring-2", STATE[z.state].dot, selected === z.id ? "ring-white/70" : "ring-transparent")} aria-hidden />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[13px] font-semibold">{z.label}</span>
                      <span className={cx("truncate text-[11px]", selected === z.id ? "text-white/80" : "text-ink-3")}>{z.summary}</span>
                    </span>
                    <span className="sr-only">État : {STATE[z.state].label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Panneau de détails : zone, Raspberry Pi, journal */}
      <AnimatePresence initial={false}>
        {showPanel && (
          <motion.aside key="panel" aria-label="Détails" {...panelMotion}
            className="agency-hud absolute inset-x-3 bottom-3 z-10 flex max-h-[58%] flex-col rounded-2xl md:inset-x-auto md:right-3 md:top-[84px] md:max-h-none md:w-[340px]">
            <div role="tablist" aria-label="Contenu du panneau" className="flex gap-1 border-b border-line-soft p-1.5">
              {([["zone", selected ? "Zone" : "Ensemble", Box], ["pi", "Raspberry", Server], ["journal", `Journal${log ? ` · ${log.length}` : ""}`, ScrollText]] as const).map(([id, label, Icon]) => (
                <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)}
                  className={cx("inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold transition-colors duration-150", tab === id ? "bg-ink text-[var(--agency-on-ink)]" : "text-ink-3 hover:bg-surface-2 hover:text-ink")}>
                  <Icon size={14} aria-hidden />{label}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4" role="tabpanel">
              {/* Pas d'attente de sortie : le nouveau contenu est visible tout de suite (même onglet masqué),
                  l'animation ne fait qu'accompagner son arrivée en partant d'un état déjà lisible. */}
                <motion.div key={`${tab}-${selected ?? "none"}`} initial={reducedMotion ? false : { opacity: 0.55, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: EASE }}>
                  {tab === "zone" && (zone ? <ZoneDetail zone={zone} onClose={clear} /> : <Overview model={model} onSelect={select} />)}
                  {tab === "pi" && <PiPanel infra={infra} refreshing={refreshing} />}
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
                                ? <a href={e.url} target="_blank" rel="noreferrer" className="flex flex-col gap-1 rounded-xl border border-line-soft p-2.5 transition-colors hover:bg-surface-2">{body}</a>
                                : <div className="flex flex-col gap-1 rounded-xl border border-line-soft p-2.5">{body}</div>}
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  )}
                </motion.div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <div ref={tipEl} role="tooltip" aria-hidden={!tip}
        className={cx("agency-hud pointer-events-none absolute left-0 top-0 z-30 max-w-[280px] rounded-lg px-2.5 py-1.5 text-[12px] font-semibold leading-snug text-ink transition-opacity duration-100", tip ? "opacity-100" : "opacity-0")}>
        {tip}
      </div>

      {show3d && (
        <p className="agency-hud pointer-events-none absolute bottom-3 left-1/2 z-0 hidden -translate-x-1/2 rounded-full px-3 py-1.5 text-[11px] text-ink-3 xl:block">
          Glisser : tourner · Molette : zoom · Clic droit : déplacer · R : recentrer · F : plein écran{reducedMotion ? " · mouvements réduits" : ""}
        </p>
      )}
    </section>
  );
}
