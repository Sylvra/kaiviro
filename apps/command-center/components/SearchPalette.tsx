"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CornerDownLeft, Search } from "lucide-react";
import type { Adr, Decision } from "@/lib/data/plan";
import { deliverableFromApi, type ApiDeliverable } from "@/lib/contract";
import { KIND_LABEL, dataItems, search, staticItems, type SearchItem } from "@/lib/search";
import { cx } from "./ui";

async function load<T>(path: string): Promise<T[]> {
  const r = await fetch(path).catch(() => null);
  if (!r || !r.ok) return [];
  const j = (await r.json().catch(() => null)) as { data?: T[] | null } | null;
  return j?.data ?? [];
}

/** Champ « Rechercher » de la barre latérale + palette Ctrl+K (ou « / »). */
export function SearchPalette() {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>(staticItems);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  const open = useCallback(async () => {
    if (dialog.current?.open) return;
    setQuery("");
    setActive(0);
    dialog.current?.showModal();
    input.current?.focus();
    // Données relues à chaque ouverture : les statuts changent depuis le tableau.
    setLoading(true);
    const [d, dec, adr] = await Promise.all([
      load<ApiDeliverable>("/api/admin/v1/deliverables").then((xs) => xs.map(deliverableFromApi)),
      load<Decision>("/api/admin/v1/decisions"),
      load<Adr>("/api/admin/v1/adrs"),
    ]);
    setItems([...staticItems(), ...dataItems(d, dec, adr)]);
    setLoading(false);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName));
      if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void open();
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        void open();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const results = useMemo(() => search(items, query), [items, query]);
  const groups = useMemo(() => {
    const g = new Map<string, { item: SearchItem; index: number }[]>();
    results.forEach((item, index) => {
      const k = KIND_LABEL[item.kind];
      g.set(k, [...(g.get(k) ?? []), { item, index }]);
    });
    return [...g.entries()];
  }, [results]);

  function go(item: SearchItem | undefined) {
    if (!item) return;
    dialog.current?.close();
    if (item.external) window.open(item.href, "_blank", "noopener,noreferrer");
    else router.push(item.href);
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); go(results[active]); }
  }

  return (
    <>
      <button type="button" onClick={() => void open()} aria-haspopup="dialog" aria-keyshortcuts="Control+K"
        className="flex h-[38px] items-center gap-2 rounded-xl border border-ink/5 bg-white/75 px-3 text-left text-ink-3 transition-colors hover:border-ink/15">
        <Search size={15} aria-hidden />
        <span className="min-w-0 flex-1 text-[13px]">Rechercher…</span>
        <kbd className="rounded-md border border-ink/10 bg-white px-1.5 font-mono text-[11px]">Ctrl K</kbd>
      </button>

      <dialog ref={dialog} aria-label="Recherche globale" onClose={() => setQuery("")}
        className="mx-auto mt-[12vh] w-[min(600px,calc(100vw-32px))] rounded-[var(--radius-panel)] border border-line bg-white p-0 text-ink shadow-[var(--shadow-lift)] backdrop:bg-ink/30">
        <div className="flex items-center gap-2.5 border-b border-line-soft px-4">
          <Search size={17} className="shrink-0 text-ink-3" aria-hidden />
          <input ref={input} value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }} onKeyDown={onInputKey}
            role="combobox" aria-expanded={results.length > 0} aria-controls="search-results" aria-activedescendant={results[active] ? `sr-${active}` : undefined}
            aria-autocomplete="list" placeholder="Livrable, décision, ADR, page…" className="h-14 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3" />
          <kbd className="rounded-md border border-ink/10 px-1.5 font-mono text-[11px] text-ink-3">Échap</kbd>
        </div>

        <div id="search-results" role="listbox" aria-label="Résultats" className="max-h-[52vh] overflow-y-auto p-2">
          {query.trim() === "" && (
            <p className="px-3 py-6 text-center text-[13px] text-ink-3">Tape un mot : « supervision », « vpn », « ADR-0012 », « revue »…</p>
          )}
          {query.trim() !== "" && results.length === 0 && (
            <p className="px-3 py-6 text-center text-[13px] text-ink-3">{loading ? "Chargement des livrables et décisions…" : "Aucun résultat."}</p>
          )}
          {groups.map(([label, rows]) => (
            <div key={label} role="group" aria-label={label} className="flex flex-col gap-0.5 pb-1.5">
              <span className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{label}</span>
              {rows.map(({ item, index }) => {
                const on = index === active;
                return (
                  <div key={item.id} id={`sr-${index}`} role="option" aria-selected={on} onMouseMove={() => setActive(index)} onClick={() => go(item)}
                    className={cx("flex cursor-pointer items-center gap-3 rounded-[12px] px-3 py-2.5", on ? "bg-[#e8f6f3]" : "hover:bg-surface-2")}>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-[13px] font-semibold">{item.title}</span>
                      <span className="truncate text-xs text-ink-3">{item.subtitle}</span>
                    </span>
                    {item.external ? <ArrowUpRight size={15} className="shrink-0 text-ink-3" aria-label="Ouvre GitHub" /> : on && <CornerDownLeft size={14} className="shrink-0 text-ink-3" aria-hidden />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 border-t border-line-soft px-4 py-2.5 text-[11px] text-ink-3">
          <span><kbd className="font-mono">↑ ↓</kbd> naviguer</span>
          <span><kbd className="font-mono">Entrée</kbd> ouvrir</span>
          <span className="ml-auto">{loading ? "Mise à jour…" : `${items.length} éléments`}</span>
        </div>
      </dialog>
    </>
  );
}
