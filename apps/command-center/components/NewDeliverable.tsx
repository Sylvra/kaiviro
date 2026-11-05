"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { cx } from "./ui";

const MISSIONS = [
  { value: "commun", label: "Commun" },
  { value: "a", label: "Mission A" },
  { value: "b", label: "Mission B" },
] as const;
const KINDS = ["Setup", "Docs", "Doc", "Spec", "Contrat", "Sécurité", "Infra", "Produit", "Auto", "IA", "Accès", "Rapport", "Tâche"];
const DAYS = Array.from({ length: 10 }, (_, i) => i + 1);

const field = "h-10 rounded-xl border border-[#e5dfd6] bg-surface-2 px-3 text-[13px] font-normal text-ink focus-visible:border-accent";

/** Bouton « Nouveau » : crée un livrable (issue GitHub « livrable », statut À faire). */
export function NewDeliverable({ live }: { live: boolean }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open() {
    setError(null);
    dialog.current?.showModal();
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const start = Number(f.get("start"));
    const end = Number(f.get("end"));
    if (end < start) return setError("Le jour de fin doit suivre le jour de début.");
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/v1/deliverables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: f.get("title"), mission: f.get("mission"), kind: f.get("kind"),
        days: [start, end], path: (f.get("path") as string) || undefined,
      }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const p = res ? ((await res.json().catch(() => null)) as { title?: string; detail?: string } | null) : null;
      return setError(p?.detail ?? p?.title ?? "Le serveur ne répond pas.");
    }
    form.reset();
    dialog.current?.close();
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={open} className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-[13px] font-semibold text-white shadow-[0_8px_18px_-10px_rgb(15_118_110/0.8)] transition hover:bg-accent-hover active:scale-[0.98]">
        <Plus size={14} strokeWidth={2.4} aria-hidden /> Nouveau
      </button>

      <dialog ref={dialog} aria-labelledby="new-deliverable-title" className="m-auto w-[min(520px,calc(100vw-32px))] rounded-[var(--radius-panel)] border border-line bg-white p-0 text-ink shadow-[var(--shadow-lift)] backdrop:bg-ink/30">
        <form onSubmit={submit} className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 id="new-deliverable-title" className="text-lg font-bold">Nouveau livrable</h2>
              <span className="text-xs text-ink-3">Créé comme issue GitHub « livrable », colonne À faire.</span>
            </div>
            <button type="button" onClick={() => dialog.current?.close()} aria-label="Fermer" className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"><X size={16} /></button>
          </div>

          {!live && (
            <p role="status" className="rounded-xl border border-[#f3e2b3] bg-[#fff6de] px-3.5 py-2.5 text-[13px] text-amber-ink">
              GitHub n’est pas connecté : la création sera refusée. Renseigne GITHUB_TOKEN dans .env.local.
            </p>
          )}

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-2">Titre
            <input name="title" required minLength={3} maxLength={120} autoFocus placeholder="Ex. Configurer le VPN de la Pi" className={field} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-2">Mission
              <select name="mission" defaultValue="a" className={field}>{MISSIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-2">Type
              <select name="kind" defaultValue="Tâche" className={field}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-2">Jour de début
              <select name="start" defaultValue={1} className={field}>{DAYS.map((d) => <option key={d} value={d}>J{d}</option>)}</select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-2">Jour de fin
              <select name="end" defaultValue={1} className={field}>{DAYS.map((d) => <option key={d} value={d}>J{d}</option>)}</select>
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink-2">Chemin ou lien (facultatif)
            <input name="path" maxLength={160} placeholder="docs/operations/NETWORK_AND_VPN.md" className={cx(field, "font-mono")} />
          </label>

          {error && <p role="alert" className="text-[13px] text-coral-ink">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => dialog.current?.close()} className="h-10 rounded-xl border border-[#e5dfd6] px-4 text-[13px] font-semibold">Annuler</button>
            <button type="submit" disabled={busy} className="h-10 rounded-xl bg-accent px-4 text-[13px] font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60">
              {busy ? "Création…" : "Créer le livrable"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
