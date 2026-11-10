"use client";

import { useState } from "react";
import { aire, graduations, indexProche, points, polyligne, type Cadre } from "@/lib/charts";

const CADRE: Cadre = { largeur: 640, hauteur: 230, gauche: 40, droite: 40, haut: 20, bas: 30 };

/** Courbe cumulée prévu / terminé sur la durée du plan, avec réticule et infobulle au survol. */
export function BurnUp({
  prevu,
  termine,
  total,
  jourCourant,
}: {
  prevu: number[];
  termine: number[];
  total: number;
  jourCourant: number;
}) {
  const n = prevu.length;
  const ptsPrevu = points(prevu, CADRE, total, n);
  const ptsFait = points(termine, CADRE, total, n);
  const base = CADRE.hauteur - CADRE.bas;
  const [survol, setSurvol] = useState<number | null>(null);
  const i = survol ?? jourCourant - 1;
  const [xi] = ptsPrevu[i]!;
  const fait = termine[i];
  const prev = prevu[i]!;

  function surDeplacement(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * CADRE.largeur;
    setSurvol(indexProche(x, CADRE, n));
  }

  const gauchePct = (xi / CADRE.largeur) * 100;
  const ecart = fait === undefined ? null : prev - fait;

  return (
    <div className="-mx-1 overflow-x-auto px-1">
    <figure className="relative m-0 min-w-[520px]">
      <svg
        viewBox={`0 0 ${CADRE.largeur} ${CADRE.hauteur}`}
        role="img"
        aria-label={`Courbe cumulée : ${termine.at(-1)} tâches terminées à J${jourCourant} contre ${prevu[jourCourant - 1]} prévues ; ${total} prévues à J${n}`}
        className="block h-auto w-full touch-none"
        onPointerMove={surDeplacement}
        onPointerLeave={() => setSurvol(null)}
      >
        <g className="font-mono" fontSize="11" fill="var(--muted)">
          {graduations(total, 4).map((g) => {
            const y = base - (g / total) * (base - CADRE.haut);
            return (
              <g key={g}>
                <text x={CADRE.gauche - 12} y={y + 3} textAnchor="end">
                  {g}
                </text>
                <path d={`M${CADRE.gauche} ${y}H${CADRE.largeur - CADRE.droite}`} stroke={g === 0 ? "var(--axis)" : "var(--grid)"} />
              </g>
            );
          })}
          {ptsPrevu.map(([x], j) => (
            <text
              key={j}
              x={x}
              y={CADRE.hauteur - 10}
              textAnchor="middle"
              fill={j === jourCourant - 1 ? "var(--ink)" : undefined}
              fontWeight={j === jourCourant - 1 ? 600 : undefined}
            >
              J{j + 1}
            </text>
          ))}
        </g>

        <path d={aire(ptsFait, base)} fill="var(--accent)" fillOpacity="0.08" />
        <polyline
          points={polyligne(ptsPrevu)}
          fill="none"
          stroke="var(--faint)"
          strokeWidth="2"
          strokeDasharray="5 5"
        />
        <polyline
          points={polyligne(ptsFait)}
          pathLength={1}
          className="draw"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.25"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <path d={`M${xi} ${CADRE.haut}V${base}`} stroke="var(--ink)" strokeDasharray="2 3" opacity="0.45" />
        <circle cx={xi} cy={ptsPrevu[i]![1]} r="4" fill="var(--surface)" stroke="var(--faint)" strokeWidth="2" />
        {ptsFait[i] && <circle cx={xi} cy={ptsFait[i]![1]} r="5" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />}

        <rect x="0" y="0" width={CADRE.largeur} height={CADRE.hauteur} fill="transparent" />
      </svg>

      <div
        role="status"
        className="pointer-events-none absolute top-[6%] rounded-[10px] bg-tip px-2.5 py-2 text-xs leading-snug text-on-tip shadow-lg transition-[left] duration-150"
        style={gauchePct > 60 ? { right: `${100 - gauchePct + 2}%` } : { left: `${gauchePct + 2}%` }}
      >
        <b className="font-semibold">
          J{i + 1}
          {i === jourCourant - 1 ? " · aujourd’hui" : ""}
        </b>
        <br />
        {fait === undefined ? `${prev} prévues · à venir` : `${fait} terminées · ${prev} prévues`}
        {ecart !== null && ecart > 0 && (
          <>
            <br />
            <span className="opacity-80">écart : {ecart} en retard sur le plan</span>
          </>
        )}
      </div>
    </figure>
    </div>
  );
}
