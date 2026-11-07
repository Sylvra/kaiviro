"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Deliverable, Owner } from "@/lib/data/plan";
import { MILESTONES, PLAN_DAY } from "@/lib/data/plan";
import { OWNER_INITIALS, OWNER_LABEL, OWNER_TONE, TONE } from "./tone";
import { cx } from "./ui";

const GROUPS: { o: Owner; label: string }[] = [
  { o: "C", label: "Commun" },
  { o: "A", label: "Mission A — Admin & Ops" },
  { o: "B", label: "Mission B — Stack applicative" },
];

/** current : jour réel du plan (0 = pas commencé, null = inconnu). */
export function Gantt({ items, current }: { items: Deliverable[]; current: number | null }) {
  const [showMs, setShowMs] = useState(true);
  const days = Array.from({ length: PLAN_DAY.total }, (_, i) => i + 1);
  const rows: ({ kind: "group"; o: Owner; label: string } | { kind: "task"; d: Deliverable })[] = [];
  GROUPS.forEach((g) => {
    rows.push({ kind: "group", ...g });
    items.filter((d) => d.owner === g.o).forEach((d) => rows.push({ kind: "task", d }));
  });

  return (
    <section aria-label="Planning" className="flex flex-col gap-4 px-6 pb-6 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] text-ink-3">Plan indicatif M0 · {PLAN_DAY.total} jours ouvrés · M0_PLAN §5</span>
        <button type="button" aria-pressed={showMs} onClick={() => setShowMs((v) => !v)} className="inline-flex h-8 items-center gap-2.5 rounded-full border border-line bg-surface-2 py-0 pl-1.5 pr-3 text-xs font-semibold">
          <span className={cx("flex h-[18px] w-[30px] rounded-full p-0.5 transition-colors", showMs ? "justify-end bg-accent" : "justify-start bg-[#d9d3ca]")}>
            <motion.span layout transition={{ type: "spring", stiffness: 600, damping: 34 }} className="size-3.5 rounded-full bg-white shadow" />
          </span>
          Jalons
        </button>
      </div>

      <div className="overflow-x-auto rounded-[18px] border border-line-soft bg-[#fdfcfa]">
        <div className="relative grid min-w-[900px] gap-y-2 px-4 pb-4 pt-3.5" style={{ gridTemplateColumns: `230px repeat(${PLAN_DAY.total}, minmax(0,1fr))` }}>
          <span className="pb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">Livrable</span>
          {days.map((n) => (
            <span key={n} className="flex flex-col items-center gap-0.5 border-b border-line-soft pb-2">
              <span aria-current={n === current ? "date" : undefined} className={cx("font-mono text-[11px] font-semibold", n === current ? "text-coral-ink" : "text-ink-3")}>J{n}</span>
              <span className={cx("size-1.5 rounded-full", n === current ? "bg-coral-dot" : "bg-transparent")} />
            </span>
          ))}

          <AnimatePresence>
            {showMs && MILESTONES.map((m) => (
              <motion.span key={m.label} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}
                title={m.label} className="z-[1] self-end justify-self-center" style={{ gridRow: 1, gridColumn: `${m.days[0] + 1} / ${m.days[1] + 2}`, translate: "0 13px" }}>
                <span className="block size-3 rotate-45 rounded-[3px] bg-ink shadow-[0_0_0_3px_#fdfcfa]" />
              </motion.span>
            ))}
          </AnimatePresence>

          {rows.map((r, idx) => {
            const row = idx + 2;
            if (r.kind === "group") {
              return <span key={r.o} className="col-start-1 flex items-center gap-2 pt-1 text-[13px] font-bold" style={{ gridRow: row }}><span className={cx("size-2 rounded-[3px]", TONE[OWNER_TONE[r.o]].dot)} />{r.label}</span>;
            }
            const d = r.d;
            const tone = TONE[OWNER_TONE[d.owner]];
            const done = d.status === 3;
            return [
              <span key={`${d.id}-l`} className="col-start-1 flex min-w-0 items-center gap-2 pr-2.5 text-[13px] text-ink-2" style={{ gridRow: row }}>
                <span className={cx("size-2 shrink-0 rounded-full", done ? tone.dot : "bg-[#d9d3ca]")} />
                <span className="truncate">{d.title}</span>
              </span>,
              <motion.span key={`${d.id}-b`} initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 160, damping: 22, delay: idx * 0.02 }}
                className={cx("mx-[3px] flex h-[30px] origin-left items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-[10px] px-2.5 text-xs font-semibold", done ? cx(tone.dot, "text-white") : cx(tone.bg, tone.ink, "ring-1 ring-inset ring-ink/5"))}
                style={{ gridRow: row, gridColumn: `${d.days[0] + 1} / ${d.days[1] + 2}` }}>
                <span className={cx("grid size-[18px] place-items-center rounded-full bg-white text-[9px] font-bold", tone.ink)}>{OWNER_INITIALS[d.owner]}</span>
                {d.days[0] === d.days[1] ? `J${d.days[0]}` : `J${d.days[0]}–J${d.days[1]}`}
              </motion.span>,
            ];
          })}
        </div>
      </div>

      {showMs && (
        <div className="flex flex-wrap gap-2.5">
          {MILESTONES.map((m) => (
            <span key={m.label} className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs">
              <span className="size-[9px] rotate-45 rounded-[2px] bg-ink" />
              <span className="font-mono text-ink-3">{m.days[0] === m.days[1] ? `J${m.days[0]}` : `J${m.days[0]}–J${m.days[1]}`}</span>
              <span className="font-semibold">{m.label}</span>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

export { OWNER_LABEL };
