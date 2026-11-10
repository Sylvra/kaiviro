"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { NAV } from "@/lib/nav";
import { taches } from "@/lib/data/exemple";
import { Icon, type NomIcone } from "./Icon";

interface Cible {
  label: string;
  groupe: string;
  href: string;
  icone: NomIcone;
}

const CIBLES: Cible[] = [
  ...NAV.flatMap((g) =>
    g.entrees.filter((e) => e.href).map((e) => ({ label: e.label, groupe: g.label, href: e.href!, icone: e.icone })),
  ),
  ...taches.map((t) => ({ label: t.titre, groupe: "Tâches", href: `/taches?t=${t.id}`, icone: "tasks" as const })),
];

const normaliser = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Recherche rapide (Ctrl K) : pages actives et tâches. */
export function Palette() {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const champ = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [actif, setActif] = useState(0);

  const resultats = useMemo(() => {
    const n = normaliser(q.trim());
    return n ? CIBLES.filter((c) => normaliser(c.label).includes(n)).slice(0, 8) : CIBLES.slice(0, 8);
  }, [q]);

  function ouvrir() {
    setQ("");
    setActif(0);
    dialog.current?.showModal();
    requestAnimationFrame(() => champ.current?.focus());
  }

  function aller(c: Cible | undefined) {
    if (!c) return;
    dialog.current?.close();
    router.push(c.href);
  }

  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ouvrir();
      }
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={ouvrir}
        className="flex h-[34px] w-full items-center gap-2 rounded-[9px] border border-line-strong bg-surface px-2.5 text-[13px] text-muted shadow-[0_1px_1px_rgb(20_20_22/0.04)]"
      >
        <Icon nom="search" taille={14} epaisseur={2} />
        <span className="flex-1 text-left">Rechercher</span>
        <kbd className="font-mono text-[11px] text-muted">Ctrl K</kbd>
      </button>

      <dialog
        ref={dialog}
        aria-label="Recherche"
        className="m-auto mt-[12vh] w-[min(560px,calc(100vw-32px))] rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/30"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      >
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Icon nom="search" taille={16} epaisseur={2} />
          <input
            ref={champ}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActif(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActif((a) => Math.min(a + 1, resultats.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActif((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                aller(resultats[actif]);
              }
            }}
            placeholder="Page, tâche…"
            aria-label="Rechercher une page ou une tâche"
            aria-controls="palette-resultats"
            aria-activedescendant={resultats[actif] ? `palette-${actif}` : undefined}
            className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
          />
          <kbd className="font-mono text-[11px] text-muted">Échap</kbd>
        </div>
        <ul id="palette-resultats" role="listbox" className="m-0 max-h-[50vh] list-none overflow-auto p-2">
          {resultats.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-muted">Aucun résultat.</li>}
          {resultats.map((c, i) => (
            <li
              key={c.href}
              id={`palette-${i}`}
              role="option"
              aria-selected={i === actif}
              onMouseEnter={() => setActif(i)}
              onClick={() => aller(c)}
              className={`flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] ${i === actif ? "bg-grid" : ""}`}
            >
              <span className="text-muted">
                <Icon nom={c.icone} />
              </span>
              <span className="flex-1 font-medium">{c.label}</span>
              <span className="text-xs text-muted">{c.groupe}</span>
            </li>
          ))}
        </ul>
      </dialog>
    </>
  );
}
