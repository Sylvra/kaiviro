"use client";

import { useRef, useState } from "react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { Download, Pencil, Plus, Trash2, X } from "lucide-react";
import { CONSENTS, EVENT_LABEL, INTERACTIONS, PARTNER_OWNERS, PARTNER_STAGES, PARTNER_TYPES, addDays, dueState, partnerBodyToApi, partnerFromApi, retentionAlerts, type ApiPartner, type Partner, type PartnerStage, type PartnerType } from "@/lib/partners";
import type { Tone } from "@/lib/data/ops";
import { Pill, cx } from "./ui";
import { TONE } from "./tone";
import { field } from "./NewDeliverable";
import { PartnerBackups } from "./PartnerBackups";

const TYPE_TONE: Record<PartnerType, Tone> = { garage: "mint", obd: "sky", beta: "lavender" };
const STAGE_TINT = ["bg-[#f6f3ee]", "bg-[#eef5fc]", "bg-[#e9f7f1]", "bg-[#fff6e3]", "bg-[#f1efec]"];
const API = "/api/admin/v1/partners";

/** Réponse de l'API (format du contrat) → fiche interne. */
const fromApi = (d: unknown) => (d && typeof d === "object" && "consent_status" in d ? partnerFromApi(d as ApiPartner) : d);

/** Appel de l'API partenaires : le corps est converti au format du contrat, la réponse en fiche interne. */
async function call(url: string, method: string, body?: Record<string, unknown>): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(partnerBodyToApi(body)) }).catch(() => null);
  if (!r) return { ok: false, error: "Le serveur ne répond pas." };
  if (r.status === 204) return { ok: true, data: null };
  const j = await r.json().catch(() => null);
  return r.ok ? { ok: true, data: fromApi(j?.data) } : { ok: false, error: j?.detail ?? j?.title ?? `Erreur ${r.status}` };
}

/** Champs communs à la création et à la modification. `type` seulement à la création (il fixe la référence). */
function Fields({ p, withType }: { p?: Partner; withType: boolean }) {
  const lab = "flex flex-col gap-1.5 text-xs font-semibold text-ink-2";
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {withType && (
          <label className={lab}>Type
            <select name="type" defaultValue={p?.type ?? "garage"} className={field}>{(Object.keys(PARTNER_TYPES) as PartnerType[]).map((t) => <option key={t} value={t}>{PARTNER_TYPES[t]}</option>)}</select>
          </label>
        )}
        <label className={cx(lab, !withType && "col-span-2")}>Nom (organisation ou personne)
          <input name="name" required minLength={2} maxLength={120} defaultValue={p?.name} className={field} />
        </label>
        <label className={lab}>Rôle
          <input name="role" maxLength={80} defaultValue={p?.role} placeholder="Gérant, commercial…" className={field} />
        </label>
        <label className={lab}>Contact professionnel
          <input name="contact" maxLength={160} defaultValue={p?.contact} placeholder="E-mail ou téléphone pro" className={field} />
        </label>
        <label className={lab}>Responsable
          <select name="owner" defaultValue={p?.owner ?? "Johan"} className={field}>{PARTNER_OWNERS.map((o) => <option key={o}>{o}</option>)}</select>
        </label>
        <label className={lab}>Consentement
          <select name="consent" defaultValue={p?.consent ?? "À recueillir"} className={field}>{CONSENTS.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <label className={lab}>Prochaine action
          <input name="next" maxLength={200} defaultValue={p?.next} className={field} />
        </label>
        <label className={lab}>Relance le
          <input name="due" type="date" defaultValue={p?.due ?? ""} className={field} />
        </label>
      </div>
      <label className={lab}>Matériel prêté ou testé
        <input name="gear" maxLength={120} defaultValue={p?.gear} className={field} />
      </label>
      <label className={lab}>Note (aucune donnée sensible)
        <textarea name="note" rows={3} maxLength={2000} defaultValue={p?.note} className="resize-y rounded-xl border border-[#e5dfd6] bg-surface-2 px-3 py-2.5 text-[13px] font-normal text-ink" />
      </label>
    </>
  );
}

const read = (form: HTMLFormElement) => {
  const f = new FormData(form);
  const s = (k: string) => String(f.get(k) ?? "").trim();
  return { ...(f.has("type") ? { type: s("type") } : {}), name: s("name"), role: s("role"), contact: s("contact"), owner: s("owner"), consent: s("consent"), next: s("next"), due: s("due"), gear: s("gear"), note: s("note") };
};

/** Pastille de relance : date courte, rouge si dépassée, ambre si aujourd'hui. */
function DuePill({ due, today }: { due?: string; today: string }) {
  const s = dueState(due, today);
  if (s === "none") return null;
  const label = s === "overdue" ? `Relance en retard · ${shortDate(due!)}` : s === "today" ? "Relance aujourd’hui" : `Relance ${shortDate(due!)}`;
  return <Pill tone={s === "overdue" ? "coral" : s === "today" ? "amber" : "neutral"}>{label}</Pill>;
}

/** Historique de la fiche (plus récent en haut) et saisie d'une interaction. */
function History({ p, today, busy, onAdd }: { p: Partner; today: string; busy: boolean; onAdd: (b: { kind: string; text: string; date: string }) => Promise<boolean> }) {
  const events = [...(p.events ?? [])].reverse();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    if (await onAdd({ kind: String(f.get("kind")), text: String(f.get("text")).trim(), date: String(f.get("date")) })) form.reset();
  }
  return (
    <section aria-label="Historique" className="flex flex-col gap-2.5">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">Historique{events.length ? ` · ${events.length}` : ""}</h3>
      <form onSubmit={submit} className="flex flex-col gap-2 rounded-xl border border-line-soft bg-white p-2.5">
        <div className="grid grid-cols-2 gap-2">
          <select name="kind" defaultValue="appel" aria-label="Type d’interaction" className={cx(field, "h-9")}>{Object.entries(INTERACTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <input name="date" type="date" defaultValue={today} max={today} aria-label="Date" className={cx(field, "h-9")} />
        </div>
        <textarea name="text" rows={2} required maxLength={1000} placeholder="Ce qui s’est dit, décidé, envoyé…" aria-label="Résumé de l’interaction" className="resize-y rounded-xl border border-[#e5dfd6] bg-surface-2 px-3 py-2 text-[13px] text-ink" />
        <button type="submit" disabled={busy} className="h-8 self-end rounded-lg bg-ink px-3 text-xs font-semibold text-white disabled:opacity-50">Ajouter à l’historique</button>
      </form>
      {events.length === 0 ? <p className="text-xs text-ink-3">Aucun événement enregistré.</p> : (
        <ol className="flex flex-col gap-2 border-l-2 border-line-soft pl-3">
          {events.map((e) => (
            <li key={e.id} className="flex flex-col gap-0.5">
              <span className="flex items-center gap-2 text-xs">
                <span className={cx("font-semibold", e.kind in INTERACTIONS ? "text-accent" : "text-ink-2")}>{EVENT_LABEL[e.kind]}</span>
                <span className="text-ink-3">{new Date(e.at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </span>
              <span className="whitespace-pre-line text-[13px] text-ink-2">{e.text}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

const shortDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

export function Partners({ initial, available, today, focus }: { initial: Partner[]; available: boolean; today: string; focus?: string }) {
  const reduce = useReducedMotion();
  const [list, setList] = useState(initial);
  const [type, setType] = useState<PartnerType | "all">("all");
  const [sel, setSel] = useState((focus && initial.some((p) => p.id === focus) ? focus : initial[0]?.id) ?? "");
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const createDialog = useRef<HTMLDialogElement>(null);
  const visible = list.filter((p) => type === "all" || p.type === type);
  const cur = list.find((p) => p.id === sel) ?? list[0];
  const alerts = retentionAlerts(list, today);

  const select = (id: string) => { setSel(id); setMode("view"); setError(null); };
  const replace = (p: Partner) => setList((l) => l.map((x) => (x.id === p.id ? p : x)));

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true); setError(null);
    const r = await call(API, "POST", { ...read(form), reason: "Création de la fiche partenaire" });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    const p = r.data as Partner;
    setList((l) => [...l, p]);
    select(p.id);
    form.reset();
    createDialog.current?.close();
  }

  async function patch(p: Partner, changes: Record<string, unknown>) {
    setBusy(true); setError(null);
    const onlyStage = Object.keys(changes).length === 1 && typeof changes.stage === "number";
    const reason = onlyStage ? `Étape → ${PARTNER_STAGES[changes.stage as PartnerStage]}` : "Modification de la fiche partenaire";
    const r = await call(`${API}/${p.id}`, "PATCH", { ...changes, reason });
    setBusy(false);
    if (!r.ok) { setError(r.error); return false; }
    replace(r.data as Partner);
    return true;
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (cur && await patch(cur, read(e.currentTarget))) setMode("view");
  }

  async function remove(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cur) return;
    const f = new FormData(e.currentTarget);
    const confirm = String(f.get("confirm") ?? "");
    const reason = String(f.get("reason") ?? "").trim();
    setBusy(true); setError(null);
    const r = await call(`${API}/${cur.id}`, "DELETE", { confirm, reason });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    const rest = list.filter((p) => p.id !== cur.id);
    setList(rest);
    select(rest[0]?.id ?? "");
  }

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
        <div className="flex flex-wrap gap-2">
          <PartnerBackups />
          {list.length > 0 && <a href={`${API}/export`} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#e5dfd6] bg-white px-3 text-[13px] font-semibold"><Download size={14} aria-hidden />Exporter tout</a>}
          <button type="button" disabled={!available} onClick={() => { setError(null); createDialog.current?.showModal(); }} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-3.5 text-[13px] font-semibold text-white transition hover:bg-accent-hover disabled:opacity-50">
            <Plus size={14} aria-hidden />Nouveau partenaire
          </button>
        </div>
      </div>

      {alerts.length > 0 && (
        <div role="status" className="flex flex-col gap-1 rounded-xl border border-[#f2dca5] bg-amber-bg px-3.5 py-2.5 text-[13px] text-amber-ink">
          <strong className="font-semibold">Conservation des données : {alerts.length} fiche{alerts.length > 1 ? "s" : ""} à traiter (durées proposées, CRM_SPEC §5.8)</strong>
          <ul className="flex flex-col gap-0.5">
            {alerts.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => select(a.id)} className="font-mono underline underline-offset-2">{a.ref}</button> {a.name} · {a.reason} · {a.overdue ? `échéance dépassée (${a.due})` : `échéance ${a.due}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!available && <p role="alert" className="rounded-xl border border-[#f6d2c1] bg-coral-bg px-3.5 py-2.5 text-[13px] text-coral-ink">Le fichier data/partners.json est illisible : rien n’est modifiable tant qu’il n’est pas réparé.</p>}

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius-panel)] border border-dashed border-ink/15 px-6 py-14 text-center">
          <h2 className="text-lg font-bold">Aucun partenaire</h2>
          <p className="max-w-md text-[13px] text-ink-3">Garages testeurs, fournisseurs d’adaptateurs OBD et bêta-testeurs. Les fiches restent sur ce poste, dans un fichier ignoré par Git.</p>
          <button type="button" disabled={!available} onClick={() => createDialog.current?.showModal()} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-accent px-4 text-[13px] font-semibold text-white disabled:opacity-50"><Plus size={14} aria-hidden />Créer le premier</button>
        </div>
      ) : (
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
                        <motion.button key={p.id} layout={!reduce} layoutId={reduce ? undefined : `p-${p.id}`} transition={{ type: "spring", stiffness: 420, damping: 32 }}
                          type="button" aria-pressed={cur?.id === p.id} onClick={() => select(p.id)}
                          className={cx("flex w-full flex-col gap-2 rounded-[var(--radius-card)] border-[1.5px] bg-white p-3 text-left shadow-[var(--shadow-card)]", cur?.id === p.id ? "border-accent" : "border-line-soft")}>
                          <span className="flex items-center justify-between"><Pill tone={TYPE_TONE[p.type]}>{PARTNER_TYPES[p.type]}</Pill><span className="font-mono text-[11px] text-ink-3">{p.ref}</span></span>
                          <span className="text-sm font-semibold">{p.name}</span>
                          {p.next && <span className="text-xs text-ink-3">{p.next}</span>}
                          <DuePill due={p.due} today={today} />
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
            <aside aria-label="Fiche partenaire" className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5 rounded-[var(--radius-panel)] border border-line bg-surface-2 p-5">
              <div className="flex items-center gap-3">
                <span className={cx("grid size-[46px] shrink-0 place-items-center rounded-[14px] font-display text-[17px] font-bold", TONE[TYPE_TONE[cur.type]].bg, TONE[TYPE_TONE[cur.type]].ink)}>{cur.name.charAt(0)}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5"><h2 className="truncate text-[17px] font-bold">{cur.name}</h2><span className="text-xs text-ink-3">{cur.ref} · {PARTNER_TYPES[cur.type]}</span></div>
                {mode === "view" && <button type="button" onClick={() => setMode("edit")} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#e5dfd6] bg-white px-2.5 text-xs font-semibold"><Pencil size={13} aria-hidden />Modifier</button>}
              </div>

              {mode === "edit" ? (
                <form key={cur.id + cur.updatedAt} onSubmit={save} className="flex flex-col gap-3">
                  <Fields p={cur} withType={false} />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => { setMode("view"); setError(null); }} className="h-9 rounded-xl border border-[#e5dfd6] bg-white px-3.5 text-[13px] font-semibold">Annuler</button>
                    <button type="submit" disabled={busy} className="h-9 rounded-xl bg-accent px-3.5 text-[13px] font-semibold text-white disabled:opacity-60">{busy ? "…" : "Enregistrer"}</button>
                  </div>
                </form>
              ) : (
                <>
                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">Étape</legend>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PARTNER_STAGES.map((s, i) => (
                        <button key={s} type="button" aria-pressed={cur.stage === i} disabled={cur.stage === i || busy} onClick={() => void patch(cur, { stage: i as PartnerStage })}
                          className={cx("h-9 rounded-xl border px-2 text-xs font-semibold transition", cur.stage === i ? "border-accent bg-accent text-white" : "border-[#e5dfd6] bg-white hover:border-ink/30")}>{s}</button>
                      ))}
                    </div>
                  </fieldset>
                  <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-2.5 gap-y-2.5 text-[13px]">
                    <dt className="text-ink-3">Rôle</dt><dd>{cur.role || "—"}</dd>
                    <dt className="text-ink-3">Contact pro</dt><dd className="break-all">{cur.contact || "—"}</dd>
                    <dt className="text-ink-3">Prochaine action</dt><dd>{cur.next || "—"}</dd>
                    <dt className="text-ink-3">Relance</dt>
                    <dd className="flex flex-wrap items-center gap-1.5">
                      {cur.due ? <DuePill due={cur.due} today={today} /> : <span className="text-ink-3">Aucune</span>}
                      <button type="button" disabled={busy} onClick={() => void patch(cur, { due: addDays(cur.due && cur.due > today ? cur.due : today, 7) })}
                        className="h-7 rounded-lg border border-[#e5dfd6] bg-white px-2 text-xs font-semibold disabled:opacity-50">{cur.due ? "+7 jours" : "Dans 7 jours"}</button>
                      {cur.due && (
                        <button type="button" disabled={busy} onClick={() => void patch(cur, { due: "" })}
                          className="h-7 rounded-lg border border-[#e5dfd6] bg-white px-2 text-xs font-semibold disabled:opacity-50">Fait</button>
                      )}
                    </dd>
                    <dt className="text-ink-3">Responsable</dt><dd>{cur.owner}</dd>
                    <dt className="text-ink-3">Matériel</dt><dd>{cur.gear || "—"}</dd>
                    <dt className="text-ink-3">Consentement</dt><dd><Pill tone={cur.consent === "Retiré" ? "coral" : cur.consent === "À recueillir" ? "amber" : cur.consent === "Recueilli" ? "mint" : "neutral"}>{cur.consent}</Pill></dd>
                    {cur.note && <><dt className="text-ink-3">Note</dt><dd className="whitespace-pre-line">{cur.note}</dd></>}
                    <dt className="text-ink-3">Mis à jour</dt><dd className="text-ink-3">{new Date(cur.updatedAt).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</dd>
                  </dl>
                  <History p={cur} today={today} busy={busy} onAdd={async (body) => {
                    setBusy(true); setError(null);
                    const r = await call(`${API}/${cur.id}/events`, "POST", { ...body, reason: "Interaction ajoutée à l’historique" });
                    setBusy(false);
                    if (!r.ok) { setError(r.error); return false; }
                    replace(r.data as Partner);
                    return true;
                  }} />
                  {mode === "delete" ? (
                    <form onSubmit={remove} className="flex flex-col gap-2 rounded-xl border border-[#f6d2c1] bg-coral-bg p-3">
                      <label className="flex flex-col gap-1.5 text-xs font-semibold text-coral-ink">Suppression définitive. Retape <span className="font-mono">{cur.ref}</span> pour confirmer.
                        <input name="confirm" autoComplete="off" required className={cx(field, "bg-white font-mono")} />
                      </label>
                      <label className="flex flex-col gap-1.5 text-xs font-semibold text-coral-ink">Motif (journalisé)
                        <input name="reason" required minLength={3} maxLength={500} placeholder="Demande d’effacement, fin de relation…" className={cx(field, "bg-white")} />
                      </label>
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => { setMode("view"); setError(null); }} className="h-9 rounded-xl border border-[#e5dfd6] bg-white px-3.5 text-[13px] font-semibold">Annuler</button>
                        <button type="submit" disabled={busy} className="h-9 rounded-xl bg-[#b4402a] px-3.5 text-[13px] font-semibold text-white disabled:opacity-60">Supprimer</button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <a href={`${API}/export?id=${cur.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#e5dfd6] bg-white px-3 text-[13px] font-semibold"><Download size={14} aria-hidden />Exporter la fiche</a>
                      <button type="button" onClick={() => setMode("delete")} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#e5dfd6] bg-white px-3 text-[13px] font-semibold text-coral-ink"><Trash2 size={14} aria-hidden />Supprimer</button>
                    </div>
                  )}
                </>
              )}
              {error && <p role="alert" className="text-[13px] text-coral-ink">{error}</p>}
              <span className="text-xs text-ink-3">Données minimisées : nom, rôle, contact professionnel. Stockées sur ce poste uniquement (data/partners.json, ignoré par Git). Export et suppression sur demande.</span>
            </aside>
          )}
        </div>
      )}

      <dialog ref={createDialog} aria-labelledby="new-partner-title" className="m-auto w-[min(560px,calc(100vw-32px))] rounded-[var(--radius-panel)] border border-line bg-white p-0 text-ink shadow-[var(--shadow-lift)] backdrop:bg-ink/30">
        <form onSubmit={create} className="flex flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 id="new-partner-title" className="text-lg font-bold">Nouveau partenaire</h2>
              <span className="text-xs text-ink-3">Colonne « À contacter ». Référence attribuée automatiquement.</span>
            </div>
            <button type="button" onClick={() => createDialog.current?.close()} aria-label="Fermer" className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-surface-2"><X size={16} /></button>
          </div>
          <Fields withType />
          {error && <p role="alert" className="text-[13px] text-coral-ink">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => createDialog.current?.close()} className="h-10 rounded-xl border border-[#e5dfd6] px-4 text-[13px] font-semibold">Annuler</button>
            <button type="submit" disabled={busy} className="h-10 rounded-xl bg-accent px-4 text-[13px] font-semibold text-white disabled:opacity-60">{busy ? "Création…" : "Créer"}</button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
