---
title: Supervision — fichiers proposés
owner: mission-a
status: DRAFT
version: 0.1
updated: 2026-11-05
---

# Supervision — fichiers proposés

> Propositions. **Johan relit et applique** sur la Pi. Rien n'est déployé par une instance Claude.

| Fichier | Rôle |
|---|---|
| [`compose.yaml`](compose.yaml) | Services par profils (étapes d'[ADR-0010](../../docs/adr/ADR-0010-observabilite-et-pi.md)) |
| [`.env.example`](.env.example) | Variables attendues, sans valeur réelle |
| [`prometheus/prometheus.yml`](prometheus/prometheus.yml) | Cibles de collecte |

Déploiement par étapes, sur la Pi, dans `/opt/kaiviro/monitoring/` :

```bash
cp .env.example .env        # puis remplir localement, jamais commité
sudo docker compose --profile uptime up -d
sudo docker compose --profile uptime --profile metrics up -d
sudo docker compose --profile uptime --profile metrics --profile dashboards up -d
```

Avant le premier lancement : vérifier chaque tag, ajouter le digest `@sha256:` et contrôler la disponibilité `linux/arm64` ([CONTAINERS §4](../../docs/operations/CONTAINERS.md)).

Validation locale sans lancer : `docker compose config` (vérifie la syntaxe et les variables).
