---
title: Rapport CC-M1 — Command Center (prototype)
owner: mission-a
status: PROPOSED
version: 0.2
updated: 2026-11-09
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

Captures : 12 vues desktop et 2 mobiles prises lors du parcours Playwright, non versionnées dans le dépôt.

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
| three 0.187.0, @react-three/fiber 9.8.2, @react-three/drei 10.7.9 (+ @types/three) | MIT | agence 3D `/agency` (ADR-0014, COMMAND_CENTER_3D) ; ajoutées le 2026-11-07 à la demande de Johan ; chargées seulement sur `/agency` |

Versions épinglées exactement dans `package.json`, `package-lock.json` commité.

### Agence 3D (`/agency`, avancée de CC-M4 à la demande de Johan, 2026-11-07)

- Plateau isométrique : 10 zones (Executive, Livrables, Décisions, Partenaires, Development Studio, Knowledge, Infrastructure · Pi, AI Lab, Automotive, Security), toutes construites depuis les mêmes sources que la 2D (`lib/agency.ts`, testé).
- Règles de COMMAND_CENTER_3D respectées : données réelles uniquement, voyant « inconnu » gris sans source, rendu à la demande sans animation simulant une activité, paquet 3D séparé, repli 2D sans WebGL, liste accessible au clavier, `prefers-reduced-motion`, 3D désactivée par défaut sur mobile.
- Journal (`lib/activity.ts`) : flux d'événements GitHub du dépôt + historique des partenaires.
- Correctif au passage : `gh()` relance les erreurs internes de Next (`unstable_rethrow`) au lieu de les avaler, sinon certaines pages étaient figées au build.

## 4. Template

Aucun template acheté n'est utilisé ni présent. Le style s'inspire du niveau de finition de Kanbo / Sable ; tout le code est original (ADR-0015).

## 5. Convention GitHub proposée (à valider ensemble)

- Livrable : label `livrable` + `mission:a|b|commun` + `status:todo|doing|review|done` + `type:<x>` + `jours:3-4`. Issue fermée = Terminé.
- Décision : label `decision` + `owner:a|b|humains` + `ref:ADR-00xx`. Issue fermée = tranchée, l'ADR est mise à jour dans la même PR.
- Dès qu'au moins une issue `livrable` existe et que le jeton est fourni, le Tableau passe en « S1 · GitHub issues » et n'utilise plus le plan.
- Corps d'une issue livrable : une ligne « Chemin : » suivie du chemin entre accents graves, ex. ``Chemin : `docs/...` ``. Corps d'une issue décision : résumé, contexte, puis `## Options` en liste.
- **Appliquée le 2026-11-05** (choix de Johan) : labels créés, issues #3 à #22 (20 livrables, statuts réels) et #23 à #28 (6 décisions ; #27 « Protection des branches » close : hook `pre-push` local, pas de GitHub Pro).
- **Écriture du statut activée** (niveau 2) : `PATCH /api/admin/v1/deliverables/gh-{n}` remplace le label `status:*` et ferme l'issue en Terminé. Sans authentification avant CC-M3 (ADR-0012) : serveur lié à 127.0.0.1, JSON obligatoire, origine identique exigée. Tableau, Planning et Décisions sont rendus à chaque requête.
- **Création et décisions** (même garde, `lib/api/guard.ts`) : bouton « Nouveau » → `POST /api/admin/v1/deliverables` (issue `livrable`, À faire) ; Décisions → `POST /api/admin/v1/decisions/gh-{n}` pour publier un avis (commentaire), trancher (option retenue en commentaire + fermeture) ou rouvrir. L'ADR liée reste mise à jour par PR.

## 6. Ce que Johan doit fournir

1. Un jeton GitHub *fine-grained*, dépôt `kaiviro` uniquement, permissions **Contents: read, Issues: read and write, Pull requests: read, Metadata: read**, dans `apps/command-center/.env.local` (`GITHUB_TOKEN=…`). Jamais dans le chat ni dans Git. Sans le droit d'écriture, le tableau reste lisible et chaque déplacement est annulé avec un message.
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

## 9. Alignement sur les contrats M0 (2026-11-09)

Après fusion de `develop` (M0 mission A, PR #2), quatre écarts corrigés :

| Écart | Correction |
|---|---|
| Enveloppe de provenance hors schéma (`static`, source en texte libre, pas de `unknown_reason`) | `lib/contract.ts` : `source` = `S1`…`S9` ou `ref:<chemin>`, `source_label`, `unknown_reason` déduit ou explicite. Schéma `freshness` v0.2 : `static` et `source_label` ajoutés, enveloppe plate `data` + champs |
| Écritures N2/N3 sans motif ni audit | `lib/api/audit.ts` : garde, motif obligatoire (`reason` ou `X-Kaiviro-Reason`), journal en ajout seul `data/audit.jsonl` au format `audit-event` (`requested` puis `succeeded`/`denied`/`failed`). 9 routes concernées. Champ « Motif » saisi pour la suppression, l'import et la restauration (N3) |
| Livrables hors OpenAPI (statut 0–3, `kind`, `days`) | API : statut `todo`/`in_progress`/`in_review`/`done`, `type`, `mission` (`commun`/`a`/`b`/`humains`), `days` en extension. Les labels GitHub `status:*` ne changent pas |
| Partenaires hors OpenAPI (4 étapes, types courts, pas de conservation) | 5 étapes dont « Clos », types `obd_supplier`/`beta_tester`, consentement `withdrawn` (« Retiré »). Bandeau de conservation (CRM_SPEC §5.8, durées proposées) : rien n'est effacé automatiquement. Le stockage local et l'export gardent le format interne |

Écarts assumés, à valider :

- **Motifs générés** pour les N2 de routine (déplacement sur le tableau, commentaire, interaction) : le motif décrit l'action, il n'est pas saisi. ADMIN_PERMISSIONS demande un motif saisi : à trancher.
- Acteur d'audit « local-admin » tant que l'authentification n'existe pas (CC-M3).
- OpenAPI v0.2 régénérée par script : diff large, contenu aligné sur les routes réelles du prototype (`/decisions/{id}` remplace `/decisions/{id}/comments`, ajout des routes partenaires `events`, `import`, `backups`).
- Type de partenaire `other` retiré du contrat (absent du prototype).

Contrôles : `tsc --noEmit` OK ; `vitest` 12 fichiers, 80 tests OK (17 nouveaux : adaptateurs, conservation, audit) ; `validate_contracts.py` 0 erreur (méta-validation et OpenAPI complète en CI).

## 10. Backlog proposé

- **CC-M1 (suite)** : labels GitHub + création des issues livrables ; écriture du statut (niveau 2) derrière l'auth ; recherche globale ; tests axe et E2E.
- **CC-M2** : S4 Uptime Kuma, S5 Prometheus/Node Exporter, S6 journal de sauvegarde, S7 contrat de supervision ; alertes.
- **CC-M3** : authentification admin + MFA, audit, incidents, actions N2/N3.
- **CC-M4** : vue 3D sur les mêmes endpoints.
