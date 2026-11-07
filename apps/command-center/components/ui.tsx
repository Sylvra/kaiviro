import type { ReactNode } from "react";
import type { Tone } from "@/lib/data/ops";
import type { Sourced } from "@/lib/sources/types";
import { ageLabel } from "@/lib/sources/freshness";
import { TONE } from "./tone";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Pill({ tone = "neutral", children, dot = false, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  const t = TONE[tone];
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold", t.bg, t.ink, className)}>
      {dot && <span aria-hidden className={cx("size-1.5 rounded-full", t.dot)} />}
      {children}
    </span>
  );
}

export function Panel({ children, className, tone }: { children: ReactNode; className?: string; tone?: "plain" | "soft" }) {
  return (
    <section className={cx("flex flex-col gap-3 rounded-[var(--radius-panel)] border border-line p-5", tone === "soft" ? "bg-surface-2" : "bg-surface", className)}>
      {children}
    </section>
  );
}

export function PanelTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-base font-bold">{children}</h2>
      {aside && <div className="text-xs text-ink-3">{aside}</div>}
    </div>
  );
}

export function DemoBadge() {
  return <span className="inline-flex items-center rounded-full border border-[#f3e2b3] bg-[#fff6de] px-2.5 py-1 text-[11px] font-semibold text-amber-ink">Données de démonstration</span>;
}

/** Affiche une provenance. Obligatoire sous toute valeur mesurée (test « no-source »). */
export function SourceNote({ s, className }: { s: Pick<Sourced<unknown>, "source" | "fetchedAt" | "freshness" | "demo">; className?: string }) {
  const state = s.freshness === "static" ? "référence" : s.freshness === "live" ? ageLabel(s.fetchedAt) : s.freshness === "stale" ? `périmé · ${ageLabel(s.fetchedAt)}` : "jamais mesuré";
  return (
    <span data-source={s.source} className={cx("font-mono text-[11px] text-ink-3", className)}>
      {s.source} · {state}{s.demo ? " · démo" : ""}
    </span>
  );
}

/** Valeur inconnue : jamais présentée comme saine. */
export function UnknownTile({ label, source, size = "lg" }: { label: string; source: string; size?: "lg" | "md" }) {
  return (
    <article className="flex flex-col gap-2 rounded-[18px] border border-line bg-surface-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold">{label}</span>
        <Pill>Inconnu</Pill>
      </div>
      <span className={cx("font-display font-bold leading-none text-ghost", size === "lg" ? "text-3xl" : "text-2xl")} aria-label="valeur inconnue">—</span>
      <span data-source={source} className="text-xs text-ink-3">Source : {source}</span>
      <span className="font-mono text-[11px] text-ink-3">jamais mesuré</span>
    </article>
  );
}

export function Avatar({ initials, tone = "neutral", size = 32, square = false, title }: { initials: string; tone?: Tone | "dark"; size?: number; square?: boolean; title?: string }) {
  const cls = tone === "dark" ? "bg-ink text-[#7fe0c4] font-mono" : cx(TONE[tone].bg, TONE[tone].ink);
  return (
    <span title={title} style={{ width: size, height: size }} className={cx("grid shrink-0 place-items-center border-2 border-white text-xs font-semibold", square ? "rounded-[12px]" : "rounded-full", cls)}>
      {initials}
    </span>
  );
}

export function Logo() {
  return (
    <span className="grid size-9 place-items-center rounded-[11px] bg-ink shadow-[0_6px_14px_-6px_rgb(29_27_25/0.5)]">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M7 4v16M7 12l9-8M11 9l6 11" stroke="#7FE0C4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
