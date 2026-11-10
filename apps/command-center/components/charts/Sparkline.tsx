import { aire, points, polyligne, type Cadre } from "@/lib/charts";
import type { Serie } from "@/lib/types";

const CADRE: Cadre = { largeur: 300, hauteur: 80, gauche: 0, droite: 4, haut: 7, bas: 1 };

/** Petit multiple : une mesure, son seuil d'alerte en pointillé ambre, le dernier point marqué. */
export function Sparkline({ serie }: { serie: Serie }) {
  const pts = points(serie.valeurs, CADRE, serie.max);
  const base = CADRE.hauteur - CADRE.bas;
  const ySeuil = base - (serie.seuil / serie.max) * (base - CADRE.haut);
  const dernier = serie.valeurs.at(-1)!;
  const [xd, yd] = pts.at(-1)!;

  return (
    <figure className="m-0 flex flex-col gap-1.5 rounded-xl border border-grid bg-surface px-3.5 pb-2.5 pt-3.5">
      <figcaption className="flex items-baseline justify-between">
        <span className="text-[13px] font-semibold">{serie.libelle}</span>
        <span className="text-[22px] font-bold tracking-[-0.03em]">
          {dernier} <span className="text-sm font-semibold text-muted">{serie.unite}</span>
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${CADRE.largeur} ${CADRE.hauteur}`}
        role="img"
        aria-label={`${serie.libelle} sur une heure, exemple : de ${Math.min(...serie.valeurs)} à ${Math.max(...serie.valeurs)} ${serie.unite}, seuil ${serie.seuil} ${serie.unite}`}
        className="block h-auto w-full"
      >
        <path d={`M0 ${base + 0.5}H${CADRE.largeur}`} stroke="var(--axis)" />
        <path d={`M0 ${ySeuil}H${CADRE.largeur}`} stroke="var(--warn)" strokeDasharray="3 3" />
        <path d={aire(pts, base)} fill="var(--accent)" fillOpacity="0.08" />
        <polyline
          points={polyligne(pts)}
          pathLength={1}
          className="draw"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx={xd} cy={yd} r="3.5" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
      </svg>
      <span className="flex justify-between text-[11px] text-muted">
        <span className="font-mono">−1 h</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 border-t border-dashed" style={{ borderColor: "var(--warn)" }} />
          alerte à {serie.seuil} {serie.unite}
        </span>
        <span className="font-mono">maintenant</span>
      </span>
    </figure>
  );
}
