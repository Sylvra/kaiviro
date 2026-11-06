---
name: observability
description: Use when adding or consuming a health endpoint, metric, release event or alert in KAIVIRO. Enforces the observability contract, bounded cardinality and the unknown-is-not-healthy rule.
---

# Observabilité

Squelette (mission A, 2026-11-05).

## Lire d'abord

- `docs/architecture/OBSERVABILITY_CONTRACT.md`
- `packages/schemas/ops/` (freshness, metric, service-health, deployment)
- `docs/adr/ADR-0010-observabilite-et-pi.md`

## Règles

1. Agrégats uniquement. Jamais de prompt, de réponse IA, d'identifiant utilisateur, de VIN.
2. Labels à cardinalité bornée, liste fermée.
3. Inconnu = `null` + `freshness: unknown` + raison. Jamais `0` ni `ok` par défaut.
4. Aucun seuil d'alerte inventé : seuils fixés après observation réelle.
5. Horodatage UTC ISO 8601.

## À compléter

- Catalogue des métriques réellement exportées par le backend (avec B).
