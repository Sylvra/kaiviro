# KAIVIRO NEXUS — front (NX-1)

Plateforme d'opérations KAIVIRO : projet, infrastructure, administration.
Spécification : [`docs/command-center/NEXUS_SPEC_V2.md`](../../docs/command-center/NEXUS_SPEC_V2.md) · décision : ADR-0016 (PROPOSED).

## État

- Socle du front, fidèle aux maquettes NX-0 validées le 2026-11-10.
- **Aucune source branchée.** Toutes les valeurs viennent de `lib/data/exemple.ts` et sont étiquetées « exemple ».
- Aucune écriture : les boutons d'action sont visibles mais inactifs, avec la raison au survol.
- La Raspberry Pi n'est ni contactée ni modifiée.

## Pages

| Route | Contenu |
| --- | --- |
| `/` | Overview : avancement M0, à traiter, missions, activité, infrastructure |
| `/taches` | Tâches en table ou kanban (`?vue=kanban`), aperçu de la tâche (`?t=<id>`) |
| `/infrastructure/carte` | Carte topologique ou table (`?vue=table`) |
| `/infrastructure/noeuds/raspberry-pi-5` | Fiche de nœud : métriques, services, relations, chronologie |

Recherche rapide : `Ctrl K`. Thème clair ou sombre : bouton de la barre, choix mémorisé dans le navigateur.

## Commandes

```bash
npm install
npm run dev        # http://127.0.0.1:3000
npm run typecheck
npm test
npm run build
```

## Structure

- `app/` : routes Next.js (App Router).
- `components/` : shell (navigation, barre, recherche, thème), graphiques, primitives d'interface.
- `lib/types.ts` : modèle d'objets (états, provenance, tâche, nœud).
- `lib/etats.ts` : jetons d'état. Une couleur n'est jamais seule, un libellé l'accompagne.
- `lib/charts.ts` : géométrie SVG pure, testée.
- `lib/data/exemple.ts` : données d'exemple, remplacées par les connecteurs en NX-2.
- `app/globals.css` : design system V2 (jetons clair et sombre).

## Dépendances

Sous-ensemble de la pile déjà validée pour CC-M1, mêmes versions épinglées : Next.js, React, Tailwind CSS, TypeScript, Vitest (licences MIT et Apache-2.0).
Polices Hanken Grotesk et JetBrains Mono (SIL OFL) via `next/font`, auto-hébergées au build.
