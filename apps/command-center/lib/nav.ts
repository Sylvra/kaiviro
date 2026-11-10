import type { NomIcone } from "@/components/Icon";

export interface EntreeNav {
  label: string;
  icone: NomIcone;
  /** Absent : page prévue dans une phase ultérieure, affichée mais inactive. */
  href?: string;
  phase?: string;
}

export interface GroupeNav {
  label: string;
  entrees: EntreeNav[];
}

export const NAV: GroupeNav[] = [
  {
    label: "Workspace",
    entrees: [
      { label: "Overview", icone: "home", href: "/" },
      { label: "Project Management", icone: "folder", phase: "NX-2" },
      { label: "Tasks & Roadmap", icone: "tasks", href: "/taches" },
      { label: "Finance & Budget", icone: "wallet", phase: "NX-3" },
      { label: "Team & Members", icone: "users", phase: "NX-2" },
    ],
  },
  {
    label: "Infrastructure",
    entrees: [
      { label: "Infrastructure Map", icone: "map", href: "/infrastructure/carte" },
      { label: "Servers & Nodes", icone: "server", href: "/infrastructure/noeuds/raspberry-pi-5" },
      { label: "Cloud Services", icone: "cloud", phase: "NX-2" },
      { label: "Containers & Services", icone: "box", phase: "NX-2" },
      { label: "Monitoring & Metrics", icone: "activity", phase: "NX-2" },
      { label: "Logs & Incidents", icone: "logs", phase: "NX-2" },
      { label: "Backups & Storage", icone: "db", phase: "NX-2" },
    ],
  },
  {
    label: "Intelligence & Administration",
    entrees: [
      { label: "AI & Agents", icone: "cpu", phase: "NX-3" },
      { label: "Knowledge Center", icone: "book", phase: "NX-3" },
      { label: "Security & Audit", icone: "shield", phase: "NX-3" },
      { label: "Virtual Agency 3D", icone: "cube", phase: "NX-4" },
      { label: "Settings", icone: "gear", phase: "NX-2" },
    ],
  },
];

/** Entrée active : correspondance exacte pour « / », par préfixe de section sinon. */
export function estActive(href: string, chemin: string): boolean {
  if (href === "/") return chemin === "/";
  const section = href.split("/").slice(0, 3).join("/");
  return chemin === href || chemin.startsWith(section + "/") || chemin === section;
}
