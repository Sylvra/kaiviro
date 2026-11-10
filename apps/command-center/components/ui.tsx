import type { ReactNode } from "react";
import { ton } from "@/lib/etats";
import type { Etat, Provenance, Relation, StatutTache, EvenementChrono } from "@/lib/types";
import { Icon } from "./Icon";

export function Point({ etat, taille = 7, carre = false }: { etat: Etat | StatutTache; taille?: number; carre?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0"
      style={{ width: taille, height: taille, borderRadius: carre ? 2 : 999, background: ton(etat).dot }}
    />
  );
}

/** Pastille d'état : point + libellé, jamais la couleur seule. */
export function Pastille({ etat, children }: { etat: Etat | StatutTache; children?: ReactNode }) {
  const t = ton(etat);
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ background: t.bg, color: t.ink }}
    >
      <Point etat={etat} taille={6} />
      {children ?? t.label}
    </span>
  );
}

/** Étiquette de provenance, en mono. « exemple » est toujours visible tant que la source n'est pas branchée. */
export function Source({ p, suffixe }: { p: Provenance; suffixe?: string }) {
  return (
    <span className="font-mono text-[11px] text-muted">
      {p.source} · {p.libelle}
      {suffixe ? ` · ${suffixe}` : ""}
      {p.exemple ? " · exemple" : ""}
    </span>
  );
}

export function Exemple() {
  return <span className="text-xs font-medium text-warn-ink">· exemple</span>;
}

export function Bloc({
  id,
  titre,
  action,
  children,
  className = "",
  padding = "p-5",
}: {
  id: string;
  titre: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <section aria-labelledby={id} className={`card flex flex-col gap-4 ${padding} ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={id} className="m-0 text-[15px] font-semibold">
          {titre}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Bouton d'action non encore disponible : visible, expliqué, inactif. */
export function BoutonInactif({ children, raison, primaire = false }: { children: ReactNode; raison: string; primaire?: boolean }) {
  return (
    <button type="button" aria-disabled="true" title={raison} className={`btn ${primaire ? "btn-primary" : ""}`}>
      {children}
    </button>
  );
}

export function NoteExemple({ children }: { children: ReactNode }) {
  return (
    <p role="note" className="m-0 flex items-start gap-2.5 rounded-xl bg-warn-bg px-3.5 py-3 text-[13px] text-warn-ink">
      <span className="mt-0.5">
        <Icon nom="warn" taille={16} epaisseur={2} />
      </span>
      <span>{children}</span>
    </p>
  );
}

export function ListeRelations({ relations }: { relations: Relation[] }) {
  if (relations.length === 0) return <p className="m-0 text-[13px] text-muted">Aucune relation.</p>;
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {relations.map((r) => {
        const contenu = (
          <>
            <Point etat={r.etat} taille={8} />
            <span className="flex-1">{r.nom}</span>
            <span className="text-xs text-muted">{r.type}</span>
          </>
        );
        const cls = "flex items-center gap-2 rounded-[10px] border border-line px-2.5 py-2 text-[13px]";
        return (
          <li key={r.nom}>
            {r.href ? (
              <a href={r.href} className={`${cls} row-link`}>
                {contenu}
              </a>
            ) : (
              <span className={cls}>{contenu}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function Chronologie({ evenements }: { evenements: EvenementChrono[] }) {
  return (
    <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
      {evenements.map((e) => (
        <li key={e.texte + e.meta} className="flex gap-2.5">
          <span className="mt-1.5">
            <Point etat={e.etat} taille={7} />
          </span>
          <span className="flex flex-col">
            <span className="text-[13px]">{e.texte}</span>
            <span className="text-xs text-muted">{e.meta}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
