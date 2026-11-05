"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { SearchPalette } from "./SearchPalette";
import { motion } from "motion/react";
import { DEPARTMENTS } from "@/lib/data/ops";
import { TONE } from "./tone";
import { Logo, cx } from "./ui";

export interface SidebarCounts {
  myOpen: number;
  decisionsOpen: number;
  day: string;
  spaces: { name: string; href: string; pct: number; meta: string; dot: string }[];
  sourcesConnected: number;
  sourcesTotal: number;
}

export function Sidebar({ counts }: { counts: SidebarCounts }) {
  const path = usePathname() ?? "/";
  const inOps = path.startsWith("/ops");

  return (
    <aside aria-label="Navigation" className="sidebar-surface flex min-w-0 flex-[1_1_250px] flex-col gap-4 rounded-[var(--radius-shell)] border border-white/80 p-4 lg:max-w-[280px]">
      <div className="flex items-center gap-2.5 p-1">
        <Logo />
        <span className="flex flex-1 flex-col leading-tight">
          <span className="font-display text-base font-bold">KAIVIRO</span>
          <span className="text-xs text-ink-3">Command Center · 2 admins</span>
        </span>
      </div>

      <div role="group" aria-label="Changer d'espace" className="relative grid grid-cols-2 gap-1 rounded-[14px] bg-white/55 p-1">
        {[{ href: "/crm/tableau", label: "CRM", on: !inOps }, { href: "/ops/overview", label: "Opérations", on: inOps }].map((s) => (
          <Link key={s.href} href={s.href} aria-current={s.on ? "page" : undefined} className={cx("relative grid h-[34px] place-items-center rounded-[10px] text-[13px] font-semibold", s.on ? "text-ink" : "text-ink-3 hover:text-ink")}>
            {s.on && <motion.span layoutId="space-pill" className="absolute inset-0 rounded-[10px] bg-white shadow-[0_1px_2px_rgb(29_27_25/0.06),0_6px_14px_-10px_rgb(29_27_25/0.35)]" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            <span className="relative">{s.label}</span>
          </Link>
        ))}
      </div>

      <SearchPalette />

      {!inOps ? (
        <>
          <nav aria-label="Raccourcis" className="flex flex-col gap-0.5">
            {[
              { label: "Mes livrables", href: "/crm/tableau", badge: String(counts.myOpen), hot: false, shape: "rounded-full border-mint-dot" },
              { label: "Décisions à prendre", href: "/crm/decisions", badge: String(counts.decisionsOpen), hot: counts.decisionsOpen > 0, shape: "rounded-[2px] border-coral-dot" },
              { label: "Planning M0", href: "/crm/planning", badge: counts.day, hot: false, shape: "rounded-[2px] border-amber-dot" },
            ].map((s) => (
              <Link key={s.label} href={s.href} className="flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-[13px] text-ink-2 transition-colors hover:bg-white/70">
                <span aria-hidden className="grid w-[18px] place-items-center"><span className={cx("size-2 border-[1.5px]", s.shape)} /></span>
                <span className="flex-1">{s.label}</span>
                <span className={cx("grid h-5 min-w-5 place-items-center rounded-full px-1.5 font-mono text-[11px]", s.hot ? "bg-coral-dot text-white" : "bg-white text-ink-2")}>{s.badge}</span>
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">Espaces</span>
              <button type="button" aria-label="Nouvel espace" className="grid size-[22px] place-items-center rounded-[7px] border border-ink/10 bg-white/70"><Plus size={12} aria-hidden /></button>
            </div>
            {counts.spaces.map((sp) => {
              const on = path.startsWith(sp.href);
              return (
                <Link key={sp.name} href={sp.href} aria-current={on ? "page" : undefined} className={cx("flex flex-col gap-1.5 rounded-[14px] px-3 py-2.5 transition-all", on ? "bg-white shadow-[var(--shadow-card)]" : "bg-white/35 hover:bg-white/70")}>
                  <span className="flex items-center gap-2">
                    <span className={cx("size-2 rounded-full", sp.dot)} />
                    <span className="flex-1 text-[13px] font-semibold">{sp.name}</span>
                    <span className="font-mono text-[11px] text-ink-3">{sp.pct}%</span>
                  </span>
                  <span className="block h-1 overflow-hidden rounded-full bg-ink/[0.07]"><span className={cx("block h-full rounded-full transition-[width] duration-500", sp.dot)} style={{ width: `${sp.pct}%` }} /></span>
                  <span className="text-xs text-ink-3">{sp.meta}</span>
                </Link>
              );
            })}
          </div>
        </>
      ) : (
        <nav aria-label="Départements" className="flex flex-col gap-1">
          <span className="px-1.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">Départements</span>
          {DEPARTMENTS.map((d) => {
            const on = path === `/ops/${d.key}`;
            const t = TONE[d.tone];
            return (
              <Link key={d.key} href={`/ops/${d.key}`} aria-current={on ? "page" : undefined} className={cx("flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-all", on ? "bg-white shadow-[var(--shadow-card)]" : "hover:bg-white/70")}>
                <span className={cx("grid size-7 shrink-0 place-items-center rounded-[9px] font-mono text-[11px] font-semibold", t.bg, t.ink)}>{d.num}</span>
                <span className={cx("flex-1 text-[13px]", on ? "font-bold" : "font-medium")}>{d.name}</span>
                <span title="Aucune source connectée" className="size-[7px] rounded-full border-[1.5px] border-neutral-dot" />
              </Link>
            );
          })}
        </nav>
      )}

      <div className="flex-1" />

      {inOps ? (
        <div className="flex flex-col gap-2.5 rounded-2xl border border-ink/5 bg-white p-3.5 shadow-[0_10px_22px_-18px_rgb(29_27_25/0.4)]">
          <span className="flex items-baseline justify-between"><span className="font-display text-sm font-bold">Sources connectées</span><span className="font-mono text-[13px] font-semibold">{counts.sourcesConnected} / {counts.sourcesTotal}</span></span>
          <span aria-hidden className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${counts.sourcesTotal}, minmax(0,1fr))` }}>
            {Array.from({ length: counts.sourcesTotal }, (_, i) => <span key={i} className={cx("h-1.5 rounded-[3px]", i < counts.sourcesConnected ? "bg-mint-dot" : "bg-[#e5dfd6]")} />)}
          </span>
          <span className="text-xs text-ink-3">Une source non branchée affiche « inconnu » partout où elle intervient.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-2xl border border-[#f3e2b3] bg-[#fff6de] p-3.5 shadow-[0_10px_22px_-16px_rgb(138_90_0/0.5)]">
          <span className="font-display text-sm font-bold text-[#5a3b00]">Atelier contrats J3–J4</span>
          <span className="text-xs text-[#6b4a08]">Fixer ensemble la supervision et le module admin du backend.</span>
          <Link href="/crm/planning" className="self-start rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink-2">Voir le planning</Link>
        </div>
      )}

      <div className="flex items-center gap-2.5 px-1 pt-1">
        <span className="grid size-8 place-items-center rounded-full bg-[#cfefe4] text-xs font-semibold text-mint-ink">JB</span>
        <span className="flex flex-1 flex-col leading-tight"><span className="text-[13px] font-semibold">Johan</span><span className="text-xs text-ink-3">Owner · Mission A</span></span>
      </div>
    </aside>
  );
}
