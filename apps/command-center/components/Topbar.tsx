import Link from "next/link";
import type { ReactNode } from "react";
import { chargerTableau } from "@/lib/donnees";
import { ThemeToggle } from "./ThemeToggle";

export interface Miette {
  label: string;
  href?: string;
}

/** Barre de page : fil d'Ariane, état des sources, actions. */
export async function Topbar({ miettes, actions }: { miettes: Miette[]; actions?: ReactNode }) {
  const { connecte, etatSources } = await chargerTableau();
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3.5 sm:px-9">
      <nav aria-label="Fil d’Ariane" className="text-[13px] text-muted">
        <ol className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0">
          {miettes.map((m, i) => {
            const dernier = i === miettes.length - 1;
            return (
              <li key={m.label} className="flex items-center gap-1.5">
                {i > 0 && (
                  <span aria-hidden="true" className="text-faint">
                    /
                  </span>
                )}
                {dernier ? (
                  <b aria-current="page" className="font-semibold text-ink">
                    {m.label}
                  </b>
                ) : m.href ? (
                  <Link href={m.href} className="hover:text-ink">
                    {m.label}
                  </Link>
                ) : (
                  <span>{m.label}</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <span className="flex-1" />
      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
        <span
          className={`inline-block size-2 rounded-full ${connecte ? "" : "hatch"}`}
          style={connecte ? { background: "var(--ok)" } : undefined}
          aria-hidden="true"
        />
        {etatSources}
      </span>
      {actions}
      <ThemeToggle />
    </header>
  );
}
