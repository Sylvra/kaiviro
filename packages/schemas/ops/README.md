---
title: Schémas d'exploitation (ops)
owner: mission-a
status: DRAFT
version: 0.1
updated: 2026-11-05
---

# Schémas d'exploitation

JSON Schema draft 2020-12. Utilisés par l'[API d'administration](../../api-contracts/admin/openapi.yaml) et par le [contrat de supervision](../../../docs/architecture/OBSERVABILITY_CONTRACT.md).

| Schéma | Rôle | Producteur |
|---|---|---|
| [`freshness`](freshness.schema.json) | Provenance et fraîcheur de toute donnée affichée | API admin |
| [`service-health`](service-health.schema.json) | Santé d'un service et de ses dépendances | backend (B), API admin |
| [`metric`](metric.schema.json) | Indicateur agrégé | API admin (depuis Prometheus) |
| [`incident`](incident.schema.json) | Incident d'exploitation | module `admin.incidents` |
| [`audit-event`](audit-event.schema.json) | Journal d'audit en ajout seul | module `admin.audit` |
| [`backup-run`](backup-run.schema.json) | État d'une sauvegarde ou d'un test de restauration | scripts `infrastructure/backups/` |
| [`deployment`](deployment.schema.json) | Version déployée, événement de release | CI, backend `/version` |

Règles :

- Toute date-heure est en UTC, ISO 8601.
- Une valeur inconnue vaut `null` et s'accompagne de `freshness: unknown`.
- Aucun champ ne contient de secret, de donnée personnelle d'utilisateur de l'app ou de contenu de conversation.
- Pas de `$id` absolu : les références entre schémas sont des chemins relatifs aux fichiers (aucun domaine réservé, ADR-0013).
- Changement incompatible = nouvelle version majeure du schéma et entrée dans le rapport de mission.
