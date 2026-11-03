---
title: Rapport CC-M1 — Command Center (prototype)
owner: mission-a
status: PROPOSED
version: 0.1
updated: 2026-11-03
---

# Rapport CC-M1 — Command Center (prototype)

Branche `feature/cc-m1-command-center`, démarrée le 03/11/2026 à la demande de Johan, **avant la recette M0**. Elle reste un prototype : fusion dans `develop` seulement après validation des ADR-0012, 0014 et 0015.

## 1. Ce qui est construit

- **Application** `apps/command-center` : Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS 4, Motion, Lucide.
- **Coque** : barre latérale (bascule CRM / Opérations animée, recherche, raccourcis avec compteurs, espaces avec progression, carte d'atelier ou compteur de sources), en-tête (anneau d'avancement, jours, avatars), onglets avec indicateur à ressort.
- **CRM** : Tableau (kanban des 20 livrables M0, cartes qui glissent entre colonnes), Planning (Gantt J1–J10 + jalons activables), Équipe (2 humains + 2 agents, branches vérifiées sur GitHub quand S1 répond), Partenaires (pipeline + fiche, démonstration signalée), Décisions (boîte de réception des 6 décisions ouvertes).
- **Opérations** : les 7 départements en 2D avec états « inconnu », tableau des 9 sources, matrice des permissions, registre ADR.
- **API** `/api/admin/v1/` : `sources`, `overview`, `deliverables` (+ `PATCH /{id}` désactivé, 501), `decisions`, `partners`, `adrs`. Chaque réponse porte `source`, `fetched_at`, `freshness`, `demo`.
- **Sources** : S1/S2 GitHub branchables par `.env.local` (lecture : issues, branches, PR, `docs/adr`). S3–S9 : déclarées, état « non connectée » partout.

Captures : [`captures/`](captures/) (12 vues desktop, 2 mobiles).

## 2. Écarts avec la maquette

| Écart | Raison |
|---|---|
| Livrables : 20 au lieu de 18 | ajout des rapports de mission A et B (M0_PLAN §4) |
| « Pack M0 v0.5 rédigé » et « Vault » en Terminé, « Spécification Command Center + CRM » en cours | état réel au 03/11 ; tout le reste « À faire » |
| Présence des humains : « inconnue » | aucune source de présence, on n'invente pas « en ligne » |
| Modifications du kanban, des partenaires et des décisions : locales | S1 en écriture et S8 non validés ; bandeau « mode local » affiché |

## 3. Dépendances ajoutées

| Paquet | Licence | Pourquoi |
|---|---|---|
| next, react, react-dom | MIT | socle (ADR-0014 à valider) |
| tailwindcss, @tailwindcss/postcss | MIT | tokens et styles |
| motion | MIT | animations à ressort (successeur de framer-motion) |
| lucide-react | ISC | icônes |
| zod | MIT | validation des entrées API |
| server-only | MIT | empêche d'importer le code serveur (jetons) côté navigateur |
| @fontsource-variable/{bricolage-grotesque, dm-sans, jetbrains-mono} | OFL-1.1 | polices auto-hébergées, aucun appel à Google Fonts |
| typescript, vitest, @testing-library/react, jsdom, @vitejs/plugin-react, @types/* | MIT / Apache-2.0 | contrôles |

Versions épinglées exactement dans `package.json`, `package-lock.json` commité.

## 4. Template

Aucun template acheté n'est utilisé ni présent. Le style s'inspire du niveau de finition de Kanbo / Sable ; tout le code est original (ADR-0015).

## 5. Convention GitHub proposée (à valider ensemble)

- Livrable : label `livrable` + `mission:a|b|commun` + `status:todo|doing|review|done` + `type:<x>` + `jours:3-4`. Issue fermée = Terminé.
- Décision : label `decision` + `owner:a|b|humains` + `ref:ADR-00xx`. Issue fermée = tranchée, l'ADR est mise à jour dans la même PR.
- Dès qu'au moins une issue `livrable` existe et que le jeton est fourni, le Tableau passe en « S1 · GitHub issues » et n'utilise plus le plan.

## 6. Ce que Johan doit fournir

1. Un jeton GitHub *fine-grained*, dépôt `kaiviro` uniquement, permissions **Contents: read, Issues: read, Pull requests: read, Metadata: read**, dans `apps/command-center/.env.local` (`GITHUB_TOKEN=…`). Jamais dans le chat ni dans Git.
2. Plus tard : accès Drive (dossier `VAULT`, lecture), Supabase (schéma `admin`), URL VPN de la Pi (CC-M2).

## 7. Contrôles exécutés

| Contrôle | Résultat |
|---|---|
| `npm run typecheck` | OK, 0 erreur |
| `npm test` | 3 fichiers, 15 tests OK (fraîcheur, conversion GitHub, statut ADR, démo, « aucune valeur sans source ») |
| `npm run build` | OK, 23 pages, 7 routes API |
| Parcours Playwright (12 vues + 2 mobiles) | OK, 0 erreur console ; clic sur une carte → bandeau « mode local » |
| Accessibilité | éléments interactifs natifs, focus visible, `prefers-reduced-motion` ; contrôle axe automatisé **non encore ajouté** |

## 8. Risques et dette

- **Pas d'authentification** : serveur limité à 127.0.0.1. À ne pas déployer avant CC-M3 (ADR-0012).
- Données de référence du plan codées dans `lib/data/plan.ts` : à supprimer quand GitHub devient la source des livrables.
- Kanban long sur « À faire » (17 cartes) : prévoir un repli par mission ou une pagination.
- Pas de test axe ni de test E2E en CI : à ajouter avec la CI de la mission A (A8).

## 9. Backlog proposé

- **CC-M1 (suite)** : labels GitHub + création des issues livrables ; écriture du statut (niveau 2) derrière l'auth ; recherche globale ; tests axe et E2E.
- **CC-M2** : S4 Uptime Kuma, S5 Prometheus/Node Exporter, S6 journal de sauvegarde, S7 contrat de supervision ; alertes.
- **CC-M3** : authentification admin + MFA, audit, incidents, actions N2/N3.
- **CC-M4** : vue 3D sur les mêmes endpoints.
