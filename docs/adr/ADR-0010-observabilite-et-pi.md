---
title: ADR-0010 — Observabilité et Raspberry Pi
owner: mission-a
status: PROPOSED
version: 0.1
updated: 2026-11-05
---

# ADR-0010 — Observabilité et Raspberry Pi

Statut : PROPOSED
Date : 2026-11-05
Propriétaire : mission-a
Relecteur : mission-b + humains

## Contexte

Le Command Center doit montrer l'état réel de KAIVIRO sans jamais afficher une donnée inconnue comme saine. Une Raspberry Pi 5 est disponible, réservée à l'administration et à la supervision, jamais à la production. Aucun service payant.

## Options étudiées

| Option | Avantages | Limites | Coûts | Licences |
|---|---|---|---|---|
| **Pile progressive Uptime Kuma → Prometheus + Node Exporter + cAdvisor → Grafana → Loki** (proposé) | Standard, libre, auto-hébergeable, étapes indépendantes | Plusieurs services à maintenir, ressources de la Pi à surveiller | 0 € | MIT, Apache 2.0, AGPL-3.0 (Grafana, Loki : usage interne) |
| Netdata seul | Installation rapide, tableaux intégrés | Moins standard pour exposer des métriques à l'API admin | 0 € (agent) | GPLv3 |
| Zabbix | Complet | Lourd pour une Pi et deux admins | 0 € | AGPL-3.0 |
| SaaS (Grafana Cloud, Better Stack…) | Pas de maintenance | Compte cloud, données hors de chez nous, offres gratuites limitées | gratuit limité puis payant | propriétaire |

## Proposition

1. Pile progressive, une étape à la fois, après mesure de l'effet de la précédente ([RASPBERRY_PI_ADMIN_CENTER §3](../operations/RASPBERRY_PI_ADMIN_CENTER.md)).
2. Docker Compose, images épinglées (tag + digest), ports liés à l'IP VPN ([CONTAINERS](../operations/CONTAINERS.md)).
3. Le Command Center ne lit **jamais** Prometheus ou Uptime Kuma directement : l'API admin interroge, agrège et ajoute la provenance ([ADMIN_ARCHITECTURE](../architecture/ADMIN_ARCHITECTURE.md)).
4. Le contrat avec l'app est [OBSERVABILITY_CONTRACT](../architecture/OBSERVABILITY_CONTRACT.md).
5. Alertes via ntfy auto-hébergé ([INCIDENT_MANAGEMENT §5](../operations/INCIDENT_MANAGEMENT.md)).
6. Les seuils d'alerte sont fixés après observation réelle, jamais inventés.

## Conséquences

- Si la Pi tombe, la supervision est aveugle mais l'app continue. Le Command Center affiche « inconnu ».
- Une sonde externe (hors Pi) serait nécessaire pour détecter la panne de la Pi elle-même : décision humaine.
- Grafana et Loki sous AGPL-3.0 : aucune modification redistribuée, usage interne uniquement.
- OpenTelemetry Collector : reporté, à réévaluer quand le backend existe.

## Points ouverts

- Rétention Prometheus (15 jours proposés) selon l'espace SSD réel.
- Collecteur de journaux pour Loki (Promtail, Alloy ou autre) : à choisir, licence à vérifier.
- Sonde externe pour la Pi.
- Grafana nécessaire dès CC-M2, ou le Command Center suffit-il ?
