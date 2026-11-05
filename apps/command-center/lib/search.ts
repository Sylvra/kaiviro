import type { Adr, Decision, Deliverable } from "@/lib/data/plan";
import { STATUS_LABELS } from "@/lib/data/plan";
import { DEPARTMENTS } from "@/lib/data/ops";

/** Recherche globale (Ctrl+K) : pages, départements, livrables, décisions et ADR. Côté client, sans écriture. */
export type SearchKind = "page" | "departement" | "livrable" | "decision" | "adr";

export interface SearchItem {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle: string;
  href: string;
  /** lien hors du Command Center (GitHub) : ouvert dans un nouvel onglet */
  external: boolean;
}

export const KIND_LABEL: Record<SearchKind, string> = {
  page: "Pages", departement: "Opérations", livrable: "Livrables", decision: "Décisions", adr: "ADR",
};

const PAGES: [string, string, string][] = [
  ["Tableau", "Kanban des livrables M0", "/crm/tableau"],
  ["Planning", "Gantt J1 → J10 et jalons", "/crm/planning"],
  ["Équipe", "Humains, agents et branches", "/crm/equipe"],
  ["Partenaires", "Pipeline et fiches (démonstration)", "/crm/partenaires"],
  ["Décisions", "Décisions à prendre", "/crm/decisions"],
  ["Opérations", "Vue d’ensemble des 7 départements", "/ops"],
];

export function staticItems(): SearchItem[] {
  return [
    ...PAGES.map(([title, subtitle, href]) => ({ id: `page:${href}`, kind: "page" as const, title, subtitle, href, external: false })),
    ...DEPARTMENTS.map((d) => ({ id: `dept:${d.key}`, kind: "departement" as const, title: d.name, subtitle: d.goal, href: `/ops/${d.key}`, external: false })),
  ];
}

/** raw.githubusercontent.com/OWNER/REPO/REF/chemin → github.com/OWNER/REPO/blob/REF/chemin */
export function githubBlobUrl(raw: string): string {
  const m = /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/(.+)$/.exec(raw);
  return m ? `https://github.com/${m[1]}/${m[2]}/blob/${m[3]}` : raw;
}

export function dataItems(deliverables: Deliverable[], decisions: Decision[], adrs: Adr[]): SearchItem[] {
  return [
    ...deliverables.map((d) => ({
      id: `livrable:${d.id}`, kind: "livrable" as const, title: d.title,
      subtitle: `${STATUS_LABELS[d.status]} · ${d.kind} · ${d.path}`,
      href: d.url ?? "/crm/tableau", external: Boolean(d.url),
    })),
    ...decisions.map((d) => ({
      id: `decision:${d.key}`, kind: "decision" as const, title: d.title,
      subtitle: `${d.resolved ? "Tranchée" : "À trancher"} · ${d.ref} · ${d.summary}`,
      href: `/crm/decisions?d=${encodeURIComponent(d.key)}`, external: false,
    })),
    ...adrs.map((a) => ({
      id: `adr:${a.id}`, kind: "adr" as const, title: `${a.id} — ${a.subject}`, subtitle: a.status,
      href: a.url ? githubBlobUrl(a.url) : "/ops/knowledge", external: Boolean(a.url),
    })),
  ];
}

/** Minuscules, sans accents ni ponctuation superflue. */
export function normalize(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[’']/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Chaque mot de la requête doit apparaître dans le titre ou le sous-titre.
 * Classement : titre qui commence par la requête, puis mots trouvés dans le titre, puis sous-titre.
 */
export function search(items: SearchItem[], query: string, limit = 12): SearchItem[] {
  const q = normalize(query);
  if (!q) return [];
  const words = q.split(" ");
  const scored: { item: SearchItem; score: number }[] = [];
  for (const item of items) {
    const title = normalize(item.title);
    const all = `${title} ${normalize(item.subtitle)}`;
    if (!words.every((w) => all.includes(w))) continue;
    let score = 0;
    if (title.startsWith(q)) score += 100;
    else if (title.includes(q)) score += 60;
    score += words.filter((w) => title.includes(w)).length * 10;
    scored.push({ item, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.item);
}
