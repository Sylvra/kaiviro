/** Pictogrammes au trait, dessinés pour NEXUS (aucune bibliothèque tierce). */
const TRACES = {
  home: "M3 10.5 12 3l9 7.5V21H3z",
  folder: "M3 6h6l2 2h10v11H3z",
  tasks: "M4 4h16v16H4z M8 12l3 3 5-6",
  wallet: "M3 7h18v12H3z M16 13h2 M3 7l3-3h11v3",
  users: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 20c0-3 3-5 6-5s6 2 6 5 M16 5a3 3 0 0 1 0 6 M18 15c2 .6 3 2.4 3 5",
  map: "M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z M9 3v15 M15 6v15",
  server: "M4 4h16v7H4z M4 13h16v7H4z M8 7.5h.01 M8 16.5h.01 M12 7.5h4 M12 16.5h4",
  cloud: "M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 9a4.5 4.5 0 0 0 1 9z",
  box: "M12 3l9 5v8l-9 5-9-5V8z M3 8l9 5 9-5 M12 13v8",
  activity: "M3 12h4l3-8 4 16 3-8h4",
  logs: "M6 3h9l4 4v14H6z M9 12h7 M9 16h7",
  db: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6 M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  cpu: "M7 7h10v10H7z M10 3v4 M14 3v4 M10 17v4 M14 17v4 M3 10h4 M3 14h4 M17 10h4 M17 14h4",
  book: "M4 5a2 2 0 0 1 2-2h12v15H6a2 2 0 0 0-2 2z M4 20a2 2 0 0 0 2 1h12v-3",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  cube: "M12 2l9 5v10l-9 5-9-5V7z M12 12l9-5 M12 12v10 M12 12L3 7",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.9 4.9l2.1 2.1 M17 17l2.1 2.1 M4.9 19.1 7 17 M17 7l2.1-2.1",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20 20l-3.5-3.5",
  plus: "M12 5v14 M5 12h14",
  chevronL: "M15 6l-6 6 6 6",
  chevronR: "M9 6l6 6-6 6",
  chevronD: "M6 9l6 6 6-6",
  warn: "M12 4l9 16H3z M12 10v4 M12 17h.01",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4",
  moon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  arrow: "M5 12h14 M13 6l6 6-6 6",
} as const;

export type NomIcone = keyof typeof TRACES;

export function Icon({ nom, taille = 15, epaisseur = 1.8 }: { nom: NomIcone; taille?: number; epaisseur?: number }) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={epaisseur}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d={TRACES[nom]} />
    </svg>
  );
}
