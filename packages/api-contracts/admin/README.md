---
title: Contrat de l'API d'administration
owner: mission-a
status: DRAFT
version: 0.1
updated: 2026-11-05
---

# Contrat de l'API d'administration

[`openapi.yaml`](openapi.yaml) : squelette OpenAPI 3.1 de `/admin/v1`.

- Spécification : mission A. Implémentation : module `admin` du backend, mission B ([ADMIN_ARCHITECTURE §5](../../../docs/architecture/ADMIN_ARCHITECTURE.md)).
- Schémas partagés : [`packages/schemas/ops/`](../../schemas/ops/README.md), référencés en chemin relatif.
- Extensions :
  - `x-kaiviro-min-role` : rôle minimal (`viewer`, `developer`, `administrator`, `owner`).
  - `x-kaiviro-level` : niveau d'action (1 consultation, 2 opération contrôlée, 3 administration sensible).
- Les niveaux 2 et 3 exigent `X-Kaiviro-Confirm` et `X-Kaiviro-Reason`. Ils sont journalisés.
- Aucun serveur réel déclaré. Le domaine `.invalid` est un placeholder (ADR-0013).

Correspondance avec [CRM_SPEC §8](../../../docs/command-center/CRM_SPEC.md) : toutes les routes du tableau y figurent, plus `/dev/pull-requests`.

Évolution : toute rupture de compatibilité incrémente la version majeure de `info.version` et se note dans le rapport de mission.
