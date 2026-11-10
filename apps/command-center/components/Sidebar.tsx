"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV, estActive } from "@/lib/nav";
import { Icon } from "./Icon";
import { Palette } from "./Palette";

function Contenu() {
  const chemin = usePathname();
  return (
    <>
      <div className="flex items-center gap-2.5 px-1.5 py-1">
        <span className="grid size-7 place-items-center rounded-lg bg-primary text-[13px] font-bold text-on-primary shadow-sm">
          K
        </span>
        <span className="flex flex-col leading-tight">
          <b className="text-sm font-bold tracking-[-0.01em]">KAIVIRO NEXUS</b>
          <span className="text-xs text-muted">Projet M0</span>
        </span>
      </div>
      <Palette />
      <nav aria-label="Sections" className="flex flex-col gap-4">
        {NAV.map((g) => (
          <div key={g.label} className="flex flex-col gap-px">
            <span className="px-2 pb-1.5 text-[11px] font-semibold text-muted">{g.label}</span>
            {g.entrees.map((e) => {
              const base = "flex h-[30px] items-center gap-2.5 rounded-[7px] px-2 text-[13px]";
              if (!e.href) {
                return (
                  <span key={e.label} className={`${base} cursor-default text-faint`} title={`Prévu en ${e.phase}`}>
                    <Icon nom={e.icone} />
                    <span className="flex-1 truncate">{e.label}</span>
                    <span className="font-mono text-[11px]">{e.phase}</span>
                  </span>
                );
              }
              const actif = estActive(e.href, chemin);
              return (
                <Link
                  key={e.label}
                  href={e.href}
                  aria-current={actif ? "page" : undefined}
                  className={`${base} transition-colors ${
                    actif
                      ? "bg-surface font-semibold text-ink shadow-[0_1px_2px_rgb(20_20_22/0.08)]"
                      : "font-medium text-ink-2 hover:bg-surface/60"
                  }`}
                >
                  <Icon nom={e.icone} />
                  <span className="flex-1 truncate">{e.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="mt-auto flex items-center gap-2.5 px-1.5 py-2">
        <span className="grid size-7 place-items-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent-ink">
          JB
        </span>
        <span className="flex flex-col leading-tight">
          <b className="text-[13px] font-semibold">Johan</b>
          <span className="text-xs text-muted">Owner</span>
        </span>
      </div>
    </>
  );
}

export function Sidebar() {
  const [ouvert, setOuvert] = useState(false);
  const chemin = usePathname();
  useEffect(() => setOuvert(false), [chemin]);

  return (
    <>
      <aside
        aria-label="Navigation"
        className="sticky top-0 hidden h-dvh w-[240px] shrink-0 flex-col gap-[18px] overflow-y-auto bg-rail px-3 py-4 lg:flex"
      >
        <Contenu />
      </aside>

      <div className="flex items-center gap-3 border-b border-line bg-rail px-4 py-2.5 lg:hidden">
        <button
          type="button"
          className="btn w-9 justify-center px-0"
          aria-expanded={ouvert}
          aria-controls="nav-mobile"
          aria-label="Ouvrir la navigation"
          onClick={() => setOuvert((o) => !o)}
        >
          <Icon nom="menu" />
        </button>
        <b className="text-sm font-bold">KAIVIRO NEXUS</b>
      </div>
      {ouvert && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" aria-label="Fermer" className="absolute inset-0 bg-black/30" onClick={() => setOuvert(false)} />
          <aside id="nav-mobile" className="fade-up absolute inset-y-0 left-0 flex w-[272px] flex-col gap-[18px] overflow-y-auto bg-rail px-3 py-4">
            <Contenu />
          </aside>
        </div>
      )}
    </>
  );
}
