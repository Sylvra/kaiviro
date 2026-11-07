"use client";

import { useMemo, useState } from "react";
import { LayoutGroup, motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ArrowRight, CalendarDays, ExternalLink } from "lucide-react";
import { DeliverableSheet } from "./DeliverableSheet";
import type { Deliverable, Owner, Status } from "@/lib/data/plan";
import { STATUS_LABELS } from "@/lib/data/plan";
import type { Freshness } from "@/lib/sources/types";
import { OWNER_INITIALS, OWNER_LABEL, OWNER_TONE, TONE } from "./tone";
import { Pill, cx } from "./ui";

const COLS: { tint: string; dot: string; shape: string }[] = [
  { tint: "bg-[#f6f3ee]", dot: "bg-neutral-dot", shape: "rounded-full" },
  { tint: "bg-[#fff6e3]", dot: "bg-amber-dot", shape: "rounded-[3px]" },
  { tint: "bg-[#f1edfd]", dot: "bg-lav-dot", shape: "rounded-[3px]" },
  { tint: "bg-[#e9f7f1]", dot: "bg-mint-dot", shape: "rounded-full" },
];

const dayLabel = (d: [number, number]) => (d[0] === d[1] ? `J${d[0]}` : `J${d[0]}–J${d[1]}`);

export function Board({ items, freshness }: { items: Deliverable[]; freshness: Freshness }) {
  const reduce = useReducedMotion();
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [filter, setFilter] = useState<Owner | "all">("all");
  const [notice, setNotice] = useState<string | null>(null);
  const live = freshness === "live";

  const st = (d: Deliverable) => status[d.id] ?? d.status;
  const visible = useMemo(() => items.filter((d) => filter === "all" || d.owner === filter), [items, filter]);

  const [openId, setOpenId] = useState<string | null>(null);
  const opened = items.find((d) => d.id === openId) ?? null;

  /** Change le statut (optimiste), l'écrit dans GitHub et revient en arrière si GitHub refuse. */
  async function setTo(d: Deliverable, next: Status): Promise<boolean> {
    const before = st(d);
    setStatus((s) => ({ ...s, [d.id]: next }));
    if (!live) {
      setNotice("Mode local : GitHub n’est pas connecté, ce changement n’est pas enregistré.");
      return false;
    }
    const res = await fetch(`/api/admin/v1/deliverables/${encodeURIComponent(d.id)}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setStatus((s) => ({ ...s, [d.id]: before }));
      setNotice("GitHub a refusé la mise à jour : le statut est revenu à sa valeur précédente.");
      return false;
    }
    return true;
  }

  const advance = (d: Deliverable) => setTo(d, ((st(d) + 1) % 4) as Status);

  const load = (["C", "A", "B"] as Owner[]).map((o) => {
    const xs = items.filter((d) => d.owner === o);
    const done = xs.filter((d) => st(d) === 3).length;
    return { o, done, total: xs.length, pct: xs.length ? Math.round((done / xs.length) * 100) : 0 };
  });

  return (
    <section aria-label="Tableau des livrables" className="flex flex-col gap-4 px-6 pb-6 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filtrer par mission" className="flex flex-wrap gap-2">
          {(["all", "C", "A", "B"] as const).map((k) => {
            const on = filter === k;
            return (
              <button key={k} type="button" aria-pressed={on} onClick={() => setFilter(k)} className={cx("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors", on ? "border-ink bg-ink text-white" : "border-[#e5dfd6] bg-white text-ink-2 hover:border-ink/30")}>
                <span className={cx("size-[7px] rounded-full", k === "all" ? (on ? "bg-white" : "bg-ink") : TONE[OWNER_TONE[k]].dot)} />
                {k === "all" ? "Toutes" : OWNER_LABEL[k]}
              </button>
            );
          })}
        </div>
        <span className="text-xs text-ink-3">Clique une carte pour ouvrir sa fiche · <ArrowRight size={12} className="inline align-[-2px]" aria-label="la flèche" /> la fait avancer.</span>
      </div>

      <AnimatePresence>
        {notice && (
          <motion.p role="status" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center justify-between gap-3 rounded-xl border border-[#f3e2b3] bg-[#fff6de] px-3.5 py-2.5 text-[13px] text-amber-ink">
            {notice}
            <button type="button" onClick={() => setNotice(null)} className="text-xs font-semibold underline">OK</button>
          </motion.p>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-start gap-3.5">
        <div className="min-w-0 flex-[999_1_640px] overflow-x-auto">
          <LayoutGroup>
            <div className="grid min-w-[760px] grid-cols-4 gap-3">
              {STATUS_LABELS.map((name, i) => {
                const cards = visible.filter((d) => st(d) === i);
                const c = COLS[i]!;
                return (
                  <div key={name} className={cx("flex min-h-[560px] flex-col gap-2.5 rounded-[18px] p-2.5", c.tint)}>
                    <div className="flex items-center gap-2 px-1 pb-0.5 pt-1">
                      <span className="grid size-[22px] place-items-center rounded-[7px] bg-white shadow-sm"><span className={cx("size-2", c.dot, c.shape)} /></span>
                      <h3 className="text-sm font-semibold">{name}</h3>
                      <span className="rounded-full bg-white/80 px-1.5 font-mono text-[11px] text-ink-2">{cards.length}</span>
                    </div>
                    {cards.map((d) => {
                      const tone = OWNER_TONE[d.owner];
                      const doneCard = i === 3;
                      return (
                        <motion.div
                          key={d.id}
                          layout={!reduce}
                          layoutId={reduce ? undefined : `card-${d.id}`}
                          transition={{ type: "spring", stiffness: 420, damping: 32 }}
                          whileHover={reduce ? undefined : { y: -2 }}
                          className="relative flex w-full flex-col gap-2 rounded-[var(--radius-card)] border border-line-soft bg-white p-3 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-lift)]"
                        >
                          <span className="flex flex-wrap gap-1.5 pr-8"><Pill tone={tone}>{OWNER_LABEL[d.owner]}</Pill><Pill>{d.kind}</Pill></span>
                          <button type="button" onClick={() => setOpenId(d.id)} aria-haspopup="dialog" aria-label={`${d.title} — ${name}. Ouvrir la fiche.`}
                            className={cx("text-left text-sm font-semibold leading-snug after:absolute after:inset-0 after:rounded-[var(--radius-card)]", doneCard && "text-ink-3 line-through")}>
                            {d.title}
                          </button>
                          <span className="truncate font-mono text-[11px] text-ink-3">{d.path}</span>
                          <span className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 text-xs text-ink-3"><CalendarDays size={13} aria-hidden />{dayLabel(d.days)}</span>
                            <span className="relative z-[1] flex items-center gap-1.5">
                              {d.url && <a href={d.url} target="_blank" rel="noreferrer" aria-label="Ouvrir l’issue GitHub" className="text-ink-3 hover:text-ink"><ExternalLink size={13} /></a>}
                              <span className={cx("grid size-6 place-items-center rounded-full text-[10px] font-bold", TONE[tone].bg, TONE[tone].ink)}>{OWNER_INITIALS[d.owner]}</span>
                            </span>
                          </span>
                          <button type="button" onClick={() => void advance(d)} aria-label={`${d.title} : passer à ${STATUS_LABELS[(i + 1) % 4]}`} title={`Passer à ${STATUS_LABELS[(i + 1) % 4]}`}
                            className="absolute right-2 top-2 z-[1] grid size-7 place-items-center rounded-lg text-ink-3 transition hover:bg-surface-2 hover:text-ink">
                            <ArrowRight size={14} />
                          </button>
                        </motion.div>
                      );
                    })}
                    {cards.length === 0 && <div className="rounded-[14px] border-[1.5px] border-dashed border-ink/10 px-3 py-6 text-center text-xs text-ink-3">Rien ici pour l’instant</div>}
                  </div>
                );
              })}
            </div>
          </LayoutGroup>
        </div>

        <div className="flex min-w-0 flex-[1_1_250px] flex-col gap-3">
          <div className="flex flex-col gap-3 rounded-[18px] border border-[#e2dafa] bg-gradient-to-br from-[#ede8fc] to-[#f6f2ff] p-4">
            <span className="text-xs font-semibold text-lav-ink">Charge M0 par mission</span>
            {load.map((l) => (
              <div key={l.o} className="flex flex-col gap-1.5">
                <span className="flex justify-between text-xs"><span className="font-semibold">{OWNER_LABEL[l.o]}</span><span className="font-mono text-ink-2">{l.done} / {l.total}</span></span>
                <span className="block h-2 overflow-hidden rounded-full bg-white/85"><motion.span className={cx("block h-full rounded-full", TONE[OWNER_TONE[l.o]].dot)} animate={{ width: `${l.pct}%` }} transition={{ type: "spring", stiffness: 120, damping: 22 }} /></span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2.5 rounded-[18px] border border-line bg-surface-2 p-4">
            <span className="text-xs font-semibold text-ink-2">Raspberry Pi 5</span>
            <span className="flex items-center gap-2.5">
              <PiIcon />
              <span className="flex flex-col gap-0.5"><span className="font-mono text-xs">16 Go · SSD 512 Go</span><span className="text-xs font-semibold text-coral-ink">Non installée · aucune métrique</span></span>
            </span>
            <span data-source="S5 · Node Exporter" className="text-xs text-ink-3">Source : S5 · Node Exporter — installation par Johan J7–J8.</span>
          </div>
        </div>
      </div>

      <DeliverableSheet item={opened} status={opened ? st(opened) : 0} live={live} onStatus={setTo} onClose={() => setOpenId(null)} />
    </section>
  );
}

export function PiIcon({ size = 42 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden>
      <rect x="6" y="9" width="32" height="26" rx="6" fill="#fff" stroke="#3B3833" strokeWidth="1.6" />
      <rect x="16" y="16" width="12" height="12" rx="2.5" fill="#DDF4EC" stroke="#0F766E" strokeWidth="1.6" />
      <path d="M12 9V5M18 9V5M26 9V5M32 9V5M12 39v-4M32 39v-4" stroke="#3B3833" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
