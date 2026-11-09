"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ExternalLink, Pencil, X } from "lucide-react";
import { DAYS, KINDS, MISSIONS, field } from "./NewDeliverable";
import type { Deliverable, Status } from "@/lib/data/plan";
import { STATUS_LABELS } from "@/lib/data/plan";
import type { IssueComment } from "@/lib/queries";
import { OWNER_LABEL, OWNER_TONE } from "./tone";
import { Pill, cx } from "./ui";

interface Detail { notes: string; comments: IssueComment[]; commentsKnown: boolean }

const MISSION_OF = { A: "a", B: "b", C: "commun", H: "commun" } as const;
/** Chemin réel du livrable : vide quand l'issue n'en a pas (path vaut alors « #n »). */
const pathOf = (d: Deliverable) => (d.path.startsWith("#") ? "" : d.path);

const dayLabel = (d: [number, number]) => (d[0] === d[1] ? `J${d[0]}` : `J${d[0]} → J${d[1]}`);
const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * Fiche d'un livrable, en panneau latéral. Le statut passe par onStatus (même écriture que le tableau).
 * Notes et commentaires sont relus dans GitHub à l'ouverture.
 */
export function DeliverableSheet({ item, status, live, onStatus, onClose }: {
  item: Deliverable | null;
  status: Status;
  live: boolean;
  onStatus: (d: Deliverable, s: Status) => Promise<boolean>;
  onClose: () => void;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const fromGithub = Boolean(item?.id.startsWith("gh-"));

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (item && !el.open) el.showModal();
    if (!item && el.open) el.close();
  }, [item]);

  const itemId = item?.id;
  useEffect(() => setEditing(false), [itemId]);

  /** Envoie seulement les champs modifiés, puis recharge le tableau depuis GitHub. */
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!item) return;
    const f = new FormData(e.currentTarget);
    const days: [number, number] = [Number(f.get("start")), Number(f.get("end"))];
    if (days[1] < days[0]) return setError("Le jour de fin doit suivre le jour de début.");
    const title = String(f.get("title")).trim();
    const mission = String(f.get("mission"));
    const kind = String(f.get("kind"));
    const path = String(f.get("path")).trim();
    const changes = {
      ...(title !== item.title ? { title } : {}),
      ...(mission !== MISSION_OF[item.owner] ? { mission } : {}),
      ...(kind !== item.kind ? { type: kind } : {}),
      ...(days[0] !== item.days[0] || days[1] !== item.days[1] ? { days } : {}),
      ...(path !== pathOf(item) ? { path } : {}),
    };
    if (Object.keys(changes).length === 0) return setEditing(false);
    setSaving(true);
    setError(null);
    const r = await fetch(`/api/admin/v1/deliverables/${encodeURIComponent(item.id)}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...changes, reason: `Fiche modifiée : ${Object.keys(changes).join(", ")}` }),
    }).catch(() => null);
    setSaving(false);
    if (!r || !r.ok) {
      const p = r ? await r.json().catch(() => null) : null;
      return setError(p?.detail ?? p?.title ?? "Le serveur ne répond pas.");
    }
    setEditing(false);
    router.refresh();
  }

  useEffect(() => {
    setDetail(null);
    setError(null);
    setDraft("");
    if (!item || !fromGithub) return;
    let stale = false;
    fetch(`/api/admin/v1/deliverables/${encodeURIComponent(item.id)}`)
      .then(async (r) => {
        const j = await r.json().catch(() => null);
        if (stale) return;
        if (!r.ok) setError(j?.detail ?? j?.title ?? "GitHub ne répond pas.");
        else setDetail(j.data as Detail);
      })
      .catch(() => { if (!stale) setError("Le serveur ne répond pas."); });
    return () => { stale = true; };
  }, [item, fromGithub]);

  async function send() {
    if (!item || !draft.trim()) return;
    setBusy(true);
    setError(null);
    const r = await fetch(`/api/admin/v1/deliverables/${encodeURIComponent(item.id)}/comments`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: draft.trim(), reason: "Commentaire ajouté depuis la fiche du livrable" }),
    }).catch(() => null);
    setBusy(false);
    if (!r || !r.ok) {
      const p = r ? await r.json().catch(() => null) : null;
      return setError(p?.detail ?? p?.title ?? "Le serveur ne répond pas.");
    }
    // Commentaire relu dans GitHub pour afficher l'auteur et l'heure réels.
    const fresh = await fetch(`/api/admin/v1/deliverables/${encodeURIComponent(item.id)}`).then((x) => x.json()).catch(() => null);
    if (fresh?.data) setDetail(fresh.data as Detail);
    setDraft("");
  }

  return (
    <dialog ref={dialog} onClose={onClose} aria-labelledby="sheet-title"
      className="ml-auto mr-0 h-dvh max-h-dvh w-[min(480px,100vw)] border-l border-line bg-white p-0 text-ink shadow-[var(--shadow-lift)] backdrop:bg-ink/25">
      {item && (
        <div className="flex h-full flex-col">
          <header className="flex flex-col gap-3 border-b border-line-soft p-5">
            <div className="flex items-start justify-between gap-3">
              <span className="flex flex-wrap gap-1.5">
                <Pill tone={OWNER_TONE[item.owner]}>{OWNER_LABEL[item.owner]}</Pill><Pill>{item.kind}</Pill>
                {fromGithub && <Pill className="font-mono">#{item.id.slice(3)}</Pill>}
              </span>
              <button type="button" onClick={() => dialog.current?.close()} aria-label="Fermer la fiche" className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"><X size={16} /></button>
            </div>
            {editing ? (
              <form key={item.id + item.title + item.path} onSubmit={save} className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-2">Titre
                  <input name="title" required minLength={3} maxLength={120} defaultValue={item.title} autoFocus className={field} />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-2">Mission
                    <select name="mission" defaultValue={MISSION_OF[item.owner]} className={field}>{MISSIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-2">Type
                    <select name="kind" defaultValue={item.kind} className={field}>{[...new Set([item.kind, ...KINDS])].map((k) => <option key={k}>{k}</option>)}</select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-2">Jour de début
                    <select name="start" defaultValue={item.days[0]} className={field}>{DAYS.map((d) => <option key={d} value={d}>J{d}</option>)}</select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-2">Jour de fin
                    <select name="end" defaultValue={item.days[1]} className={field}>{DAYS.map((d) => <option key={d} value={d}>J{d}</option>)}</select>
                  </label>
                </div>
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-2">Chemin ou lien (vide pour le retirer)
                  <input name="path" maxLength={160} defaultValue={pathOf(item)} className={cx(field, "font-mono")} />
                </label>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => { setEditing(false); setError(null); }} className="h-9 rounded-xl border border-[#e5dfd6] px-3.5 text-[13px] font-semibold">Annuler</button>
                  <button type="submit" disabled={saving} className="h-9 rounded-xl bg-accent px-3.5 text-[13px] font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60">{saving ? "Enregistrement…" : "Enregistrer sur GitHub"}</button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h2 id="sheet-title" className="text-xl font-bold leading-snug">{item.title}</h2>
                  {fromGithub && (
                    <button type="button" onClick={() => { setEditing(true); setError(null); }} disabled={!live} title={live ? undefined : "GitHub n’est pas connecté"}
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[#e5dfd6] px-2.5 text-xs font-semibold hover:border-ink/30 disabled:opacity-50">
                      <Pencil size={13} aria-hidden /> Modifier
                    </button>
                  )}
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
                  <dt className="text-ink-3">Chemin</dt><dd className="break-all font-mono text-xs">{pathOf(item) || "—"}</dd>
                  <dt className="text-ink-3">Jours</dt><dd className="inline-flex items-center gap-1"><CalendarDays size={13} aria-hidden />{dayLabel(item.days)}</dd>
                  {item.url && <><dt className="text-ink-3">GitHub</dt><dd><a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent underline-offset-2 hover:underline">Ouvrir l’issue <ExternalLink size={12} /></a></dd></>}
                </dl>
              </>
            )}
          </header>

          <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">Statut</legend>
              <div className="grid grid-cols-4 gap-1.5">
                {STATUS_LABELS.map((label, i) => (
                  <button key={label} type="button" aria-pressed={status === i} disabled={status === i}
                    onClick={() => void onStatus(item, i as Status)}
                    className={cx("h-9 rounded-xl border px-2 text-xs font-semibold transition", status === i ? "border-accent bg-accent text-white" : "border-[#e5dfd6] bg-white hover:border-ink/30")}>
                    {label}
                  </button>
                ))}
              </div>
              {!live && <span className="text-xs text-amber-ink">Mode local : GitHub n’est pas connecté, le statut n’est pas enregistré.</span>}
            </fieldset>

            <section className="flex flex-col gap-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">Notes</h3>
              {!fromGithub && <p className="text-[13px] text-ink-3">Livrable du plan, sans issue GitHub : pas de notes ni de commentaires.</p>}
              {fromGithub && !detail && !error && <p className="text-[13px] text-ink-3">Chargement…</p>}
              {detail && <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink-2">{detail.notes || "Aucune note."}</p>}
            </section>

            {fromGithub && (
              <section className="flex flex-col gap-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">Commentaires{detail ? ` · ${detail.comments.length}` : ""}</h3>
                {detail && !detail.commentsKnown && <p className="text-[13px] text-amber-ink">Commentaires indisponibles : GitHub n’a pas répondu.</p>}
                {detail?.comments.map((c) => (
                  <article key={c.id} className="flex flex-col gap-1 rounded-[14px] border border-line-soft bg-surface-2 p-3">
                    <span className="flex justify-between gap-2 text-xs text-ink-3"><span className="font-semibold text-ink-2">{c.author}</span><a href={c.url} target="_blank" rel="noreferrer" className="hover:underline">{when(c.at)}</a></span>
                    <p className="whitespace-pre-line text-[13px] leading-relaxed">{c.body}</p>
                  </article>
                ))}
                <label className="flex flex-col gap-2 text-xs font-semibold text-ink-2">Ajouter un commentaire
                  <textarea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={4000} placeholder="Avancement, blocage, lien…" className="resize-y rounded-[14px] border border-[#e5dfd6] bg-surface-2 p-3 text-[13px] font-normal text-ink" />
                </label>
                <button type="button" disabled={!draft.trim() || busy || !live} onClick={() => void send()} className="h-9 self-end rounded-xl bg-accent px-3.5 text-[13px] font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50">
                  {busy ? "Envoi…" : "Publier sur GitHub"}
                </button>
              </section>
            )}
            {error && <p role="alert" className="text-[13px] text-coral-ink">{error}</p>}
          </div>
        </div>
      )}
    </dialog>
  );
}
