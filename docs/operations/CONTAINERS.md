---
title: Conteneurs (Docker Compose)
owner: mission-a
status: DRAFT
version: 0.1
updated: 2026-11-05
---

# Conteneurs (Docker Compose)

Organisation des conteneurs de la Pi. Fichier proposé : [`infrastructure/monitoring/compose.yaml`](../../infrastructure/monitoring/compose.yaml).

## 1. Principes

1. **Un fichier Compose par domaine**, profils par étape (`uptime`, `metrics`, `dashboards`, `logs`, `alerts`).
2. **Images épinglées** : tag de version exact, puis digest `@sha256:` ajouté par Johan après vérification.
3. **Aucun port publié sur `0.0.0.0`**. Ports liés à l'IP VPN (`${BIND_ADDR}`) ou non publiés.
4. **Aucun secret dans Compose.** Variables dans un `.env` local, hors Git, à partir de `.env.example`.
5. **Utilisateur non root** quand l'image le permet ; `read_only`, `no-new-privileges`, `cap_drop: [ALL]` quand c'est compatible.
6. **Limites de ressources** (`mem_limit`, `cpus`) sur chaque service.
7. **Pas de socket Docker monté** dans un conteneur exposé. cAdvisor lit l'état en lecture seule.

## 2. Réseaux

| Réseau | Type | Membres | Rôle |
|---|---|---|---|
| `kv_monitoring` | bridge interne | prometheus, node-exporter, cadvisor, grafana, loki | Collecte, non routé vers l'extérieur |
| `kv_edge` | bridge | uptime-kuma, grafana, ntfy | Services consultés via VPN, sondes sortantes |

`kv_monitoring` est déclaré `internal: true` : pas d'accès Internet.

## 3. Volumes

| Volume | Contenu | Sauvegardé |
|---|---|---|
| `uptime_kuma_data` | Configuration et historique des sondes | oui |
| `prometheus_data` | Séries temporelles | non (reconstructible), rétention courte |
| `grafana_data` | Tableaux de bord, utilisateurs | oui |
| `loki_data` | Journaux | non, rétention courte |
| `ntfy_cache` | Cache des messages | non |

Configuration (fichiers versionnés) montée en lecture seule depuis `/opt/kaiviro/monitoring/`.

## 4. Versions proposées (relevées le 05/11/2026)

Dernières releases publiées sur GitHub au 05/11/2026. À vérifier par Johan : disponibilité `linux/arm64` et digest.

| Service | Image | Tag |
|---|---|---|
| Uptime Kuma | `louislam/uptime-kuma` | `2.5.9` |
| Prometheus | `prom/prometheus` | `v3.15.1` |
| Node Exporter | `prom/node-exporter` | `v1.12.1` |
| cAdvisor | `gcr.io/cadvisor/cadvisor` | `v0.60.6` |
| Grafana | `grafana/grafana` | `13.3.0` |
| Loki | `grafana/loki` | `3.7.9` |
| ntfy | `binwiederhier/ntfy` | `v2.37.2` |

Licences à vérifier avant installation (CLAUDE.md §3.7) : Uptime Kuma (MIT), Prometheus et Node Exporter (Apache 2.0), cAdvisor (Apache 2.0), Grafana et Loki (AGPL-3.0, usage interne sans redistribution), ntfy (Apache 2.0 / GPLv2).

## 5. Mises à jour contrôlées

1. Lire les notes de version (changements cassants, sécurité).
2. Modifier le tag dans une PR, avec le nouveau digest.
3. Après fusion : `sudo docker compose pull` puis `sudo docker compose --profile <x> up -d`.
4. Vérifier avec `check-host.sh` et le tableau des sources.
5. Retour arrière : remettre l'ancien tag et digest, `up -d`.

Support des fichiers Compose par Dependabot : à vérifier avant activation. En attendant, revue manuelle mensuelle.

## 6. Interdits

- `privileged: true` sauf justification écrite.
- `network_mode: host` sauf justification écrite.
- Tag `latest`.
- Montage du socket Docker en écriture.
