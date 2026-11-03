"use client";

import { useState } from "react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { DEMO_PARTNERS, PARTNER_STAGES, PARTNER_TYPES, type Partner, type PartnerStage, type PartnerType } from "@/lib/data/demo";
import type { Tone } from "@/lib/data/ops";
import { DemoBadge, Pill, cx } from "./ui";
import { TONE } from "./tone";

const TYPE_TONE: Record<PartnerType, Tone> = { garage: "mint", obd: "sky", beta: "lavender" };
const STAGE_TINT = ["bg-[#f6f3ee]", "bg-[#eef5fc]", "bg-[#e9f7f1]", "bg-[#fff6e3]"];

export function Partners({ initial = DEMO_PARTNERS, demo }: { initial?: Partner[]; demo: boolean }) {
  const reduce = useReducedMotion();
  const [list, setList] = useState(initial);
  const [type, setType] = useState<PartnerType | "all">("all");
  const [sel, setSel] = useState(initial[0]?.ref ?? "");
  const visible = list.filter((p) => type === "all" || p.type === type);
  const cur = list.find((p) => p.ref === sel) ?? list[0];

  const advance = (ref: string) => setList((l) => l.map((p) => (p.ref === ref ? { ...p, stage: ((p.stage + 1) % 4) as PartnerStage } : p)));

  return (
    <section aria-label="Partenaires" className="flex flex-col gap-4 px-6 pb-6 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filtrer par type" className="flex flex-wrap gap-2">
          {(["all", "garage", "obd", "beta"] as const).map((k) => {
            const on = type === k;
            const n = list.filter((p) => k === "all" || p.type === k).length;
            return (
              <button key={k} type="button" aria-pressed={on} onClick={() => setType(k)} className={cx("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors", on ? "border-ink bg-ink text-white" : "border-[#e5dfd6] bg-white text-ink-2")}>
                <span className={cx("size-[7px] rounded-full", k === "all" ? (on ? "bg-white" : "bg-ink") : TONE[TYPE_TONE[k]].dot)} />
                {k === "all" ? "Tous" : PARTNER_TYPES[k]}
                <span className={cx("font-mono font-medium", on ? "text-white/70" : "text-ink-3")}>{n}</span>
              </button>
            );
          })}
        </div>
        {demo && <DemoBadge />}
      </div>

      <div className="flex flex-wrap items-start gap-3.5">
        <div className="min-w-0 flex-[999_1_600px] overflow-x-auto">
          <LayoutGroup>
            <div className="grid min-w-[680px] grid-cols-4 gap-3">
              {PARTNER_STAGES.map((name, i) => {
                const cards = visible.filter((p) => p.stage === i);
                return (
                  <div key={name} className={cx("flex min-h-[420px] flex-col gap-2.5 rounded-[18px] p-2.5", STAGE_TINT[i])}>
                    <span className="flex items-center gap-2 p-1"><h3 className="text-sm font-semibold">{name}</h3><span className="rounded-full bg-white/80 px-1.5 font-mono text-[11px]">{cards.length}</span></span>
                    {cards.map((p) => (
                      <motion.button key={p.ref} layout={!reduce} layoutId={reduce ? undefined : `p-${p.ref}`} transition={{ type: "spring", stiffness: 420, damping: 32 }}
                        type="button" aria-pressed={sel === p.ref} onClick={() => setSel(p.ref)}
                        className={cx("flex w-full flex-col gap-2 rounded-[var(--radius-card)] border-[1.5px] bg-white p-3 text-left shadow-[var(--shadow-card)]", sel === p.ref ? "border-accent" : "border-line-soft")}>
                        <span className="flex items-center justify-between"><Pill tone={TYPE_TONE[p.type]}>{PARTNER_TYPES[p.type]}</Pill><span className="font-mono text-[11px] text-ink-3">{p.ref}</span></span>
                        <span className="text-sm font-semibold">{p.name}</span>
                        <span className="text-xs text-ink-3">{p.next}</span>
                      </motion.button>
                    ))}
                    {cards.length === 0 && <div className="rounded-[14px] border-[1.5px] border-dashed border-ink/10 px-3 py-6 text-center text-xs text-ink-3">Aucun contact</div>}
                  </div>
                );
              })}
            </div>
          </LayoutGroup>
        </div>

        {cur && (
          <aside aria-label="Fiche contact" className="flex min-w-0 flex-[1_1_280px] flex-col gap-3.5 rounded-[var(--radius-panel)] border border-line bg-surface-2 p-5">
            <div className="flex items-center gap-3">
              <span className={cx("grid size-[46px] place-items-center rounded-[14px] font-display text-[17px] font-bold", TONE[TYPE_TONE[cur.type]].bg, TONE[TYPE_TONE[cur.type]].ink)}>{cur.name.charAt(0)}</span>
              <div className="flex flex-col gap-0.5"><h2 className="text-[17px] font-bold">{cur.name}</h2><span className="text-xs text-ink-3">{PARTNER_TYPES[cur.type]} · {PARTNER_STAGES[cur.stage]}</span></div>
            </div>
            <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-2.5 gap-y-2.5 text-[13px]">
              <dt className="text-ink-3">Prochaine action</dt><dd>{cur.next}</dd>
              <dt className="text-ink-3">Responsable</dt><dd>{cur.owner}</dd>
              <dt className="text-ink-3">Matériel</dt><dd>{cur.gear}</dd>
              <dt className="text-ink-3">Consentement</dt><dd><Pill tone={cur.consent === "À recueillir" ? "amber" : "neutral"}>{cur.consent}</Pill></dd>
            </dl>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-2">Note
              <textarea rows={3} placeholder="Pas de donnée sensible ici…" className="resize-y rounded-xl border border-[#e5dfd6] bg-white px-3 py-2.5 text-[13px] font-normal text-ink" />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => advance(cur.ref)} className="h-10 flex-1 rounded-xl bg-accent text-[13px] font-semibold text-white transition hover:bg-accent-hover active:scale-[0.98]">Étape suivante</button>
              <button type="button" className="h-10 rounded-xl border border-[#e5dfd6] bg-white px-3.5 text-[13px]">Planifier</button>
            </div>
            <span className="text-xs text-ink-3">Données minimisées : nom, rôle, contact professionnel. Conservation selon DATA_CLASSIFICATION.{demo ? " Modifications locales, non enregistrées (S8 non connecté)." : ""}</span>
          </aside>
        )}
      </div>
    </section>
  );
}
