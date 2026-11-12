"use client";

import { useState } from "react";

/** Colonnes d'activité quotidienne ; le dernier jour est accentué, infobulle au survol ou au focus. */
export function Activity({ jours, nombres, indexJ1 }: { jours: string[]; nombres: number[]; indexJ1: number }) {
  const max = Math.max(...nombres, 1);
  const [actif, setActif] = useState<number | null>(null);
  const dernier = nombres.length - 1;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative flex h-24 items-end gap-1 border-b border-axis pt-1.5" role="list" aria-label="Événements par jour sur 14 jours">
        {nombres.map((n, i) => (
          <button
            key={jours[i]}
            type="button"
            role="listitem"
            aria-label={`${jours[i]} : ${n} événement${n > 1 ? "s" : ""}`}
            onPointerEnter={() => setActif(i)}
            onPointerLeave={() => setActif(null)}
            onFocus={() => setActif(i)}
            onBlur={() => setActif(null)}
            className="group relative flex h-full flex-1 items-end"
          >
            <span
              className="rise block w-full rounded-t-[4px] transition-opacity"
              style={{
                height: `${Math.max((n / max) * 100, 2)}%`,
                background: i === dernier ? "var(--accent)" : "var(--accent-3)",
                opacity: actif === null || actif === i ? 1 : 0.45,
                animationDelay: `${i * 25}ms`,
              }}
            />
          </button>
        ))}
        {actif !== null && (
          <span
            role="status"
            className="pointer-events-none absolute -top-2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-tip px-2 py-1 text-xs text-on-tip shadow-lg"
            style={{ left: `${((actif + 0.5) / nombres.length) * 100}%` }}
          >
            {jours[actif]} · <b className="font-semibold">{nombres[actif]}</b>
          </span>
        )}
      </div>
      <div className="flex justify-between font-mono text-[11px] text-muted">
        <span>{jours[0]}</span>
        {indexJ1 >= 0 && <span>{jours[indexJ1]} · J1</span>}
        <span>{jours[dernier]}</span>
      </div>
    </div>
  );
}
