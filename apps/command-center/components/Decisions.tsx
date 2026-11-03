"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ExternalLink } from "lucide-react";
import type { Decision } from "@/lib/data/plan";
import { OWNER_LABEL, OWNER_TONE } from "./tone";
import { Pill, cx } from "./ui";

export function Decisions({ items, live }: { items: Decision[]; live: boolean }) {
  const [sel, setSel] = useState(items[0]?.key ?? "");
  const [resolved, setResolved] = useState<Record<string, boolean>>({});
  const isRes = (d: Decision) => resolved[d.key] ?? d.resolved;
  const cur = items.find((d) => d.key === sel) ?? items[0];

  if (!cur) return <p className="px-6 py-10 text-center text-sm text-ink-3">Aucune décision ouverte.</p>;

  return (
    <section aria-label="Décisions" className="flex flex-wrap items-start gap-3.5 px-6 pb-6 pt-4">
      <ul className="flex min-w-0 flex-[1_1_320px] flex-col gap-1 rounded-[18px] border border-line bg-surface-2 p-1.5">
        {items.map((d) => {
          const on = d.key === cur.key;
          const r = isRes(d);
          return (
            <li key={d.key}>
              <button type="button" aria-pressed={on} onClick={() => setSel(d.key)} className={cx("relative flex w-full gap-2.5 rounded-[13px] p-3 text-left", !on && "hover:bg-white/60")}>
                {on && <motion.span layoutId="decision-sel" className="absolute inset-0 rounded-[13px] bg-white shadow-[var(--shadow-card)]" transition={{ type: "spring", stiffness: 480, damping: 38 }} />}
                <span className={cx("relative mt-1.5 size-2 shrink-0 rounded-full", r ? "bg-transparent" : "bg-coral-dot")} />
                <span className="relative flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex justify-between gap-2"><span className={cx("text-[13px]", r ? "font-medium" : "font-bold")}>{d.title}</span><span className="shrink-0 font-mono text-[11px] text-ink-3">{d.ref}</span></span>
                  <span className="truncate text-xs text-ink-3">{d.summary}</span>
                  <span className="flex gap-1.5"><Pill tone={OWNER_TONE[d.owner]}>{OWNER_LABEL[d.owner]}</Pill><Pill tone={r ? "mint" : "amber"}>{r ? "Tranchée" : "À trancher"}</Pill></span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <AnimatePresence mode="wait">
        <motion.article key={cur.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.22 }}
          className="flex min-w-0 flex-[999_1_480px] flex-col gap-4 rounded-[var(--radius-panel)] border border-line bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="flex gap-1.5"><Pill tone={OWNER_TONE[cur.owner]}>{OWNER_LABEL[cur.owner]}</Pill><Pill className="font-mono">{cur.ref}</Pill></span>
              <h2 className="text-[22px] font-bold">{cur.title}</h2>
            </div>
            <div className="flex items-center gap-2">
              {cur.url && <a href={cur.url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#e5dfd6] px-3 text-[13px]"><ExternalLink size={14} />GitHub</a>}
              <button type="button" aria-pressed={isRes(cur)} onClick={() => setResolved((s) => ({ ...s, [cur.key]: !isRes(cur) }))}
                className={cx("h-9 rounded-xl border px-3.5 text-[13px] font-semibold transition", isRes(cur) ? "border-[#e5dfd6] bg-white text-ink" : "border-accent bg-accent text-white hover:bg-accent-hover")}>
                {isRes(cur) ? "Rouvrir" : "Marquer comme tranchée"}
              </button>
            </div>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-2">{cur.context}</p>
          {cur.options.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">Options</span>
              {cur.options.map((o, i) => (
                <div key={o} className="flex gap-2.5 rounded-[14px] border border-line-soft bg-surface-2 p-3">
                  <span className="grid size-[22px] shrink-0 place-items-center rounded-[7px] border border-line bg-white font-mono text-xs font-semibold">{String.fromCharCode(65 + i)}</span>
                  <span className="text-[13px]">{o}</span>
                </div>
              ))}
            </div>
          )}
          <label className="flex flex-col gap-2 text-xs font-semibold text-ink-2">Ton avis
            <textarea rows={3} placeholder="Répondre à ton binôme…" className="resize-y rounded-[14px] border border-[#e5dfd6] bg-surface-2 p-3 text-[13px] font-normal text-ink" />
          </label>
          <span className="text-xs text-ink-3">Une fois tranchée, la décision est écrite en ADR dans docs/adr/.{live ? "" : " Mode local : l’état n’est pas enregistré tant que GitHub n’est pas connecté."}</span>
        </motion.article>
      </AnimatePresence>
    </section>
  );
}
