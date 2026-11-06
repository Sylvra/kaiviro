---
title: Contribuer à KAIVIRO
owner: mission-a
status: DRAFT
version: 0.1
updated: 2026-11-05
---

# Contribuer à KAIVIRO

Lire d'abord [`CLAUDE.md`](CLAUDE.md) et [`docs/roadmap/M0_PLAN.md`](docs/roadmap/M0_PLAN.md). Ils priment sur ce guide.

## Branches

- `main` : releases validées. `develop` : intégration. `feature/<sujet>` : travail.
- **Jamais de push sur `main` ni sur `develop`.** Une Pull Request vers `develop`, fusionnée par un humain.
- La protection des branches GitHub est indisponible sur ce dépôt (GitHub Free, privé). Un hook local `pre-push` bloque `main` et `develop` : l'installer dans chaque clone ([ADR-0001](docs/adr/ADR-0001-monorepo-et-collaboration.md)). Ne jamais le contourner (`--no-verify`).

## Propriété des fichiers

La matrice du [plan M0 §4](docs/roadmap/M0_PLAN.md) fixe qui édite quoi. Aucun fichier n'est édité par les deux missions. Pour proposer un changement sur un fichier de l'autre mission : section « Propositions croisées » de son rapport.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/fr/) avec portée : `docs(adr): ...`, `feat(contracts): ...`, `fix(infra): ...`, `chore(ci): ...`. Petits commits, un sujet chacun.

## Documents

- En-tête YAML obligatoire (`title`, `owner`, `status`, `version`, `updated`).
- Liens internes relatifs, pas de `[[wikilink]]`. Diagrammes en Mermaid.
- Une hypothèse n'est pas une décision : décision structurante = ADR au statut PROPOSED.
- Aucun fait automobile inventé : une valeur non documentée reste « inconnue ».

## Avant d'ouvrir une PR

- Aucun secret, `.env`, donnée personnelle ou sauvegarde dans le diff.
- Contrôles CI verts : lint Markdown, liens, YAML, contrats, scan de secrets ([`.github/workflows/docs-checks.yml`](.github/workflows/docs-checks.yml)).
- Aucune dépendance ajoutée sans vérification de licence, de maintenance et validation humaine.
- Remplir le modèle de PR.

## Ce qui est interdit

Déploiement, création de compte ou de ressource cloud, service payant, accès à la Raspberry Pi par une instance Claude, commande véhicule, écriture ECU, effacement de DTC, code d'un template commercial hors `apps/command-center/vendor/` ([ADR-0015](docs/adr/ADR-0015-crm-et-template-tiers.md)).
