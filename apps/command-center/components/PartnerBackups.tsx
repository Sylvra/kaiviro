"use client";

import { useRef, useState } from "react";
import { Archive, Download, RotateCcw, Upload, X } from "lucide-react";
import { cx } from "./ui";
import { field } from "./NewDeliverable";

interface Backup { name: string; at: string; count: number | null; size: number }
interface Listing { data: Backup[]; max: number; location: string; dir?: string }

const API = "/api/admin/v1/partners";
const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });

/**
 * Sauvegardes des partenaires : instantanés automatiques (un avant chaque écriture), restauration
 * et import d'un fichier exporté. Toute restauration sauvegarde d'abord l'état actuel.
 */
export function PartnerBackups() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [list, setList] = useState<Listing | null>(null);
  const [pending, setPending] = useState<{ kind: "backup"; name: string } | { kind: "file"; name: string; content: unknown } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function open() {
    setError(null); setPending(null); setList(null);
    dialog.current?.showModal();
    const r = await fetch(`${API}/backups`).catch(() => null);
    if (!r || !r.ok) return setError("Liste des sauvegardes indisponible.");
    setList((await r.json()) as Listing);
  }

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setError(null);
    try {
      setPending({ kind: "file", name: f.name, content: JSON.parse(await f.text()) });
    } catch {
      setError("Ce fichier n’est pas un JSON lisible.");
    }
  }

  async function confirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pending) return;
    const f = new FormData(e.currentTarget);
    const word = String(f.get("confirm") ?? "").trim();
    const reason = String(f.get("reason") ?? "").trim();
    setBusy(true); setError(null);
    const r = await fetch(pending.kind === "backup" ? `${API}/backups` : `${API}/import`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pending.kind === "backup" ? { name: pending.name, confirm: word, reason } : { file: pending.content, confirm: word, reason }),
    }).catch(() => null);
    setBusy(false);
    const j = r ? await r.json().catch(() => null) : null;
    if (!r || !r.ok) return setError(j?.detail ?? j?.title ?? "Le serveur ne répond pas.");
    // Les fiches affichées viennent du serveur : rechargement complet.
    window.location.reload();
  }

  return (
    <>
      <button type="button" onClick={() => void open()} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#e5dfd6] bg-white px-3 text-[13px] font-semibold">
        <Archive size={14} aria-hidden />Sauvegardes
      </button>

      <dialog ref={dialog} aria-labelledby="backups-title" className="m-auto w-[min(600px,calc(100vw-32px))] rounded-[var(--radius-panel)] border border-line bg-white p-0 text-ink shadow-[var(--shadow-lift)] backdrop:bg-ink/30">
        <div className="flex max-h-[80vh] flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 id="backups-title" className="text-lg font-bold">Sauvegardes des partenaires</h2>
              <span className="text-xs text-ink-3">
                Un instantané avant chaque modification, {list ? `${list.max} gardés` : "…"} · {list?.location === "PARTNERS_BACKUP_DIR" ? `dossier ${list.dir}` : "data/backups, sur ce disque"}.
              </span>
            </div>
            <button type="button" onClick={() => dialog.current?.close()} aria-label="Fermer" className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-surface-2"><X size={16} /></button>
          </div>

          {list?.location !== "PARTNERS_BACKUP_DIR" && (
            <p className="rounded-xl border border-[#f3e2b3] bg-[#fff6de] px-3 py-2 text-xs text-amber-ink">
              Les instantanés sont sur le même disque que les fiches : ils protègent d’une erreur, pas d’une panne. Pour une copie ailleurs, renseigne PARTNERS_BACKUP_DIR dans .env.local ou télécharge régulièrement un export.
            </p>
          )}

          {pending ? (
            <form onSubmit={confirm} className="flex flex-col gap-2 rounded-xl border border-[#f6d2c1] bg-coral-bg p-3">
              <span className="text-[13px] font-semibold text-coral-ink">
                Remplacer toutes les fiches actuelles par {pending.kind === "backup" ? `l’instantané du ${when(list?.data.find((b) => b.name === pending.name)?.at ?? "")}` : `le fichier « ${pending.name} »`} ?
              </span>
              <span className="text-xs text-coral-ink">L’état actuel est sauvegardé juste avant : tu pourras revenir en arrière.</span>
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-coral-ink">Tape RESTAURER pour confirmer
                <input name="confirm" autoComplete="off" required className={cx(field, "bg-white font-mono")} />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-coral-ink">Motif (journalisé)
                <input name="reason" required minLength={3} maxLength={500} placeholder="Retour à l’état d’hier, import depuis l’autre poste…" className={cx(field, "bg-white")} />
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setPending(null)} className="h-9 rounded-xl border border-[#e5dfd6] bg-white px-3.5 text-[13px] font-semibold">Annuler</button>
                <button type="submit" disabled={busy} className="h-9 rounded-xl bg-[#b4402a] px-3.5 text-[13px] font-semibold text-white disabled:opacity-60">{busy ? "…" : "Restaurer"}</button>
              </div>
            </form>
          ) : (
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 self-start rounded-xl border border-[#e5dfd6] bg-white px-3 text-[13px] font-semibold">
              <Upload size={14} aria-hidden />Importer un fichier exporté
              <input type="file" accept="application/json,.json" onChange={(e) => void pickFile(e)} className="sr-only" />
            </label>
          )}

          {error && <p role="alert" className="text-[13px] text-coral-ink">{error}</p>}

          <div className="min-h-0 overflow-y-auto">
            {!list && !error && <p className="text-[13px] text-ink-3">Chargement…</p>}
            {list && list.data.length === 0 && <p className="text-[13px] text-ink-3">Aucun instantané : le premier est créé à la prochaine modification d’une fiche.</p>}
            {list && list.data.length > 0 && (
              <ul className="flex flex-col divide-y divide-line-soft">
                {list.data.map((b) => (
                  <li key={b.name} className="flex items-center gap-3 py-2">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[13px] font-semibold">{when(b.at)}</span>
                      <span className="text-xs text-ink-3">{b.count === null ? "illisible" : `${b.count} fiche${b.count > 1 ? "s" : ""}`} · {(b.size / 1024).toFixed(1)} Ko</span>
                    </span>
                    <a href={`${API}/backups/${encodeURIComponent(b.name)}`} aria-label={`Télécharger l’instantané du ${when(b.at)}`} className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"><Download size={15} /></a>
                    <button type="button" disabled={b.count === null || busy} onClick={() => { setError(null); setPending({ kind: "backup", name: b.name }); }}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#e5dfd6] px-2.5 text-xs font-semibold disabled:opacity-50"><RotateCcw size={13} aria-hidden />Restaurer</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
