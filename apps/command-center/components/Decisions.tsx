"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ExternalLink } from "lucide-react";
import type { Decision } from "@/lib/data/plan";
import { OWNER_LABEL, OWNER_TONE } from "./tone";
import { Pill, cx } from "./ui";

type Action = "comment" | "resolve" | "reopen";

export function Decisions({ items, live, initial }: { items: Decision[]; live: boolean; initial?: string }) {
  const router = useRouter();
  const [sel, setSel] = useState((initial && items.some((d) => d.key === initial) ? initial : items[0]?.key) ?? "");
  const [resolved, setResolved] = useState<Record<string, boolean>>({});
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<Action | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const isRes = (d: Decision) => resolved[d.key] ?? d.resolved;
  const cur = items.find((d) => d.key === sel) ?? items[0];

  if (!cur) return <p className="px-6 py-10 text-center text-sm text-ink-3">Aucune décision ouverte.</p>;

  function select(key: string) {
    setSel(key);
    setNote("");
    setMsg(null);
  }

  /** Avec GitHub : commentaire et état écrits dans l'issue. Sans GitHub : état local seulement. */
  async function act(action: Action) {
    const d = cur!;
    if (!live) {
      if (action !== "comment") setResolved((s) => ({ ...s, [d.key]: action === "resolve" }));
      setMsg({ ok: false, text: "Mode local : GitHub n’est pas connecté, rien n’est enregistré." });
      return;
    }
    setBusy(action);
    setMsg(null);
    const res = await fetch(`/api/admin/v1/decisions/${encodeURIComponent(d.key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action, option: action === "resolve" ? choice[d.key] : undefined, note: note.trim() || undefined,
        // Motif journalisé (ADMIN_PERMISSIONS) : l'avis saisi, sinon un résumé de l'action.
        reason: note.trim().length >= 3 ? note.trim() : action === "comment" ? "Avis publié depuis le CRM" : action === "resolve" ? `Décision tranchée : ${choice[d.key] ?? "option non précisée"}` : "Décision rouverte depuis le CRM",
      }),
    }).catch(() => null);
    setBusy(null);
    if (!res || !res.ok) {
      const p = res ? ((await res.json().catch(() => null)) as { detail?: string; title?: string } | null) : null;
      setMsg({ ok: false, text: p?.detail ?? p?.title ?? "Le serveur ne répond pas." });
      return;
    }
    if (action !== "comment") setResolved((s) => ({ ...s, [d.key]: action === "resolve" }));
    setNote("");
    setMsg({ ok: true, text: action === "comment" ? "Avis publié sur l’issue GitHub." : action === "resolve" ? "Décision tranchée et issue fermée." : "Décision rouverte." });
    router.refresh();
  }

  const res = isRes(cur);
  const picked = choice[cur.key];

  return (
    <section aria-label="Décisions" className="flex flex-wrap items-start gap-3.5 px-6 pb-6 pt-4">
      <ul className="flex min-w-0 flex-[1_1_320px] flex-col gap-1 rounded-[18px] border border-line bg-surface-2 p-1.5">
        {items.map((d) => {
          const on = d.key === cur.key;
          const r = isRes(d);
          return (
            <li key={d.key}>
              <button type="button" aria-pressed={on} onClick={() => select(d.key)} className={cx("relative flex w-full gap-2.5 rounded-[13px] p-3 text-left", !on && "hover:bg-white/60")}>
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
              <span className="flex gap-1.5"><Pill tone={OWNER_TONE[cur.owner]}>{OWNER_LABEL[cur.owner]}</Pill><Pill className="font-mono">{cur.ref}</Pill><Pill tone={res ? "mint" : "amber"}>{res ? "Tranchée" : "À trancher"}</Pill></span>
              <h2 className="text-[22px] font-bold">{cur.title}</h2>
            </div>
            {cur.url && <a href={cur.url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#e5dfd6] px-3 text-[13px]"><ExternalLink size={14} />GitHub</a>}
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-2">{cur.context}</p>
          {cur.options.length > 0 && (
            <fieldset className="flex flex-col gap-2" disabled={res}>
              <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">Options{res ? "" : " · choisis celle retenue"}</legend>
              {cur.options.map((o, i) => {
                const on = picked === o;
                return (
                  <label key={o} className={cx("flex cursor-pointer gap-2.5 rounded-[14px] border p-3 transition", on ? "border-accent bg-[#e8f6f3]" : "border-line-soft bg-surface-2 hover:border-ink/20", res && "cursor-default opacity-80")}>
                    <input type="radio" name={`option-${cur.key}`} value={o} checked={on} onChange={() => setChoice((s) => ({ ...s, [cur.key]: o }))} className="sr-only" />
                    <span className={cx("grid size-[22px] shrink-0 place-items-center rounded-[7px] border font-mono text-xs font-semibold", on ? "border-accent bg-accent text-white" : "border-line bg-white")}>{String.fromCharCode(65 + i)}</span>
                    <span className="text-[13px]">{o}</span>
                  </label>
                );
              })}
            </fieldset>
          )}
          <label className="flex flex-col gap-2 text-xs font-semibold text-ink-2">Ton avis
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="Répondre à ton binôme…" className="resize-y rounded-[14px] border border-[#e5dfd6] bg-surface-2 p-3 text-[13px] font-normal text-ink" />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <AnimatePresence>
              {msg && (
                <motion.p role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cx("text-[13px]", msg.ok ? "text-accent" : "text-amber-ink")}>{msg.text}</motion.p>
              )}
            </AnimatePresence>
            <div className="ml-auto flex flex-wrap gap-2">
              <button type="button" disabled={!note.trim() || busy !== null} onClick={() => act("comment")} className="h-9 rounded-xl border border-[#e5dfd6] px-3.5 text-[13px] font-semibold disabled:opacity-50">
                {busy === "comment" ? "Envoi…" : "Envoyer l’avis"}
              </button>
              {res ? (
                <button type="button" disabled={busy !== null} onClick={() => act("reopen")} className="h-9 rounded-xl border border-[#e5dfd6] bg-white px-3.5 text-[13px] font-semibold disabled:opacity-50">
                  {busy === "reopen" ? "…" : "Rouvrir"}
                </button>
              ) : (
                <button type="button" disabled={busy !== null || (cur.options.length > 0 && !picked)} onClick={() => act("resolve")} title={cur.options.length > 0 && !picked ? "Choisis d’abord une option" : undefined}
                  className="h-9 rounded-xl border border-accent bg-accent px-3.5 text-[13px] font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50">
                  {busy === "resolve" ? "…" : "Trancher"}
                </button>
              )}
            </div>
          </div>
          <span className="text-xs text-ink-3">Trancher écrit le choix en commentaire et ferme l’issue. L’ADR liée reste à mettre à jour dans une PR.{live ? "" : " Mode local : rien n’est enregistré tant que GitHub n’est pas connecté."}</span>
        </motion.article>
      </AnimatePresence>
    </section>
  );
}
