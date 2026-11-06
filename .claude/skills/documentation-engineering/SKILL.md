---
name: documentation-engineering
description: Use when writing or editing any versioned KAIVIRO document (docs/, packages/, ADR, reports). Enforces headers, relative links, Mermaid, ADR format and file ownership.
---

# Ingénierie documentaire

Squelette (mission A, 2026-11-05).

## Règles

1. En-tête YAML : `title`, `owner`, `status`, `version`, `updated`.
2. Liens internes relatifs. Pas de `[[wikilink]]`.
3. Diagrammes en Mermaid.
4. ADR au format de `CLAUDE.md` §6, statut PROPOSED tant que non validée.
5. Ne jamais éditer un fichier de l'autre mission. Proposer dans « Propositions croisées ».
6. Toute proposition technique : avantages, limites, coûts, alternatives, risques.
7. Ne jamais recopier une note du vault : citer titre et chemin Drive.
8. Une valeur non documentée reste « inconnue ».

## Contrôles

- markdownlint (`.markdownlint-cli2.yaml`)
- liens relatifs (lychee hors ligne)
- YAML (`.yamllint.yaml`), contrats (`tests/contracts/admin/validate_contracts.py`)
