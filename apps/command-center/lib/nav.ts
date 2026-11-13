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
      { label: "Project Management", icone: "folder", href: "/projet" },
      { label: "Tasks & Roadmap", icone: "tasks", href: "/taches" },
      { label: "Finance & Budget", icone: "wallet", phase: "NX-2" },
      { label: "Team & Members", icone: "users", href: "/equipe" },
    ],
  },
  {
    label: "Infrastructure",
    entrees: [
      { label: "Infrastructure Map", icone: "map", href: "/infrastructure/carte" },
      { label: "Servers & Nodes", icone: "server", href: "/infrastructure/noeuds/raspberry-pi-5" },
      { label: "Cloud Services", icone: "cloud", href: "/infrastructure/cloud" },
      { label: "Containers & Services", icone: "box", href: "/infrastructure/services" },
      { label: "Monitoring & Metrics", icone: "activity", href: "/infrastructure/supervision" },
      { label: "Logs & Incidents", icone: "logs", phase: "NX-3" },
      { label: "Backups & Storage", icone: "db", href: "/infrastructure/stockage" },
    ],
  },
  {
    label: "Intelligence & Administration",
    entrees: [
      { label: "AI & Agents", icone: "cpu", phase: "NX-3" },
      { label: "Knowledge Center", icone: "book", href: "/connaissances" },
      { label: "Security & Audit", icone: "shield", href: "/securite" },
      { label: "Virtual Agency 3D", icone: "cube", phase: "NX-3" },
      { label: "Settings", icone: "gear", href: "/reglages" },
    ],
  },
];

/** Entrée active : correspondance exacte pour « / », par préfixe de section sinon. */
export function estActive(href: string, chemin: string): boolean {
  if (href === "/") return chemin === "/";
  const section = href.split("/").slice(0, 3).join("/");
  return chemin === href || chemin.startsWith(section + "/") || chemin === section;
}
