---
name: command-center
description: Use when specifying, reviewing or building any screen of the KAIVIRO Command Center (2D or 3D). Enforces sources, freshness, unknown states and server-side permissions.
---

# Command Center

Squelette (mission A, 2026-11-05). À compléter en CC-M1.

## Lire d'abord

- `docs/command-center/COMMAND_CENTER_SPEC.md`, `COMMAND_CENTER_NAVIGATION.md`, `DESIGN_SYSTEM.md`, `CRM_SPEC.md`
- `docs/architecture/ADMIN_ARCHITECTURE.md`
- `packages/api-contracts/admin/openapi.yaml`

## Règles

1. Le front ne parle qu'à `/admin/v1`. Jamais à Docker, PostgreSQL, Prometheus ou GitHub.
2. Chaque valeur affiche sa source et son âge. Inconnu = `—` + badge « Inconnu ».
3. Données de démonstration toujours badgées. Jamais présentées comme réelles.
4. Permissions vérifiées côté serveur. Le front masque seulement.
5. 2D d'abord. La 3D (CC-M4) reste désactivable et branchée sur les mêmes endpoints.
6. Code d'un template tiers uniquement dans `apps/command-center/vendor/<nom>/` (ADR-0015).

## Étapes

1. Identifier le département et l'écran dans COMMAND_CENTER_SPEC.
2. Lister les sources (S1–S9) et la route OpenAPI.
3. Décrire les états : chargement, réel, ancien, inconnu, démo, erreur, vide, interdit.
4. Vérifier contrastes et clavier (DESIGN_SYSTEM §10).

## À compléter

- Conventions de composants et de tests en CC-M1.
