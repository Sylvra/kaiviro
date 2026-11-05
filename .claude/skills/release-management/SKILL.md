---
name: release-management
description: Use when preparing a KAIVIRO pull request, tag or release note. Covers branch rules, Conventional Commits and release events. Never deploys.
---

# Gestion des releases

Squelette (mission A, 2026-11-05).

## Lire d'abord

- `CONTRIBUTING.md`
- `docs/adr/ADR-0001-monorepo-et-collaboration.md`
- `docs/architecture/OBSERVABILITY_CONTRACT.md` §5 (événements de release)

## Règles

1. Jamais de push sur `main` ni `develop`. PR vers `develop`, fusion humaine.
2. Ne jamais utiliser `--no-verify` ni forcer un push sur une branche partagée.
3. Conventional Commits avec portée.
4. Tag SemVer (`m0.1.0` pour le jalon M0) posé par un humain.
5. Aucun déploiement par une instance Claude.

## Étapes d'une PR

1. Vérifier la matrice de propriété (M0_PLAN §4).
2. Lancer les contrôles locaux disponibles.
3. Remplir le modèle de PR, lister l'impact sur l'autre mission.

## À compléter

- Format des notes de version et événements `deployment` émis par la CI.
