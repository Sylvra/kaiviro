---
title: Contrat de supervision (observabilité)
owner: mission-a
status: PROPOSED
version: 0.2
updated: 2026-11-09
---

# Contrat de supervision

Ce que le Command Center attend de l'application, du backend et du cloud. A rédige ce contrat. B y répond dans `M0_APP_REPORT.md` et l'intègre dans `API_CONTRACTS`. Aucun fichier n'est co-édité.

Documents liés : [ADMIN_ARCHITECTURE](ADMIN_ARCHITECTURE.md) · [ADR-0010](../adr/ADR-0010-observabilite-et-pi.md) · [schémas ops](../../packages/schemas/ops/README.md) · [CRM_SPEC §4](../command-center/CRM_SPEC.md).

## 1. Règles communes

1. **Agrégats uniquement.** Aucun identifiant d'utilisateur, aucune position, aucun VIN, aucune donnée de diagnostic individuelle, **jamais le contenu d'une conversation IA ni d'un prompt**.
2. **Lecture seule.** Les endpoints de supervision n'exposent aucune action.
3. **Réseau privé.** `/health` peut être public sous forme minimale (`status` seul). `/health/details`, `/metrics` et `/version` ne sont joignables que depuis le VPN ou avec un jeton de supervision côté serveur.
4. **Horodatage UTC ISO 8601** (`2026-11-05T09:30:00Z`) sur chaque valeur.
5. **Donnée inconnue = `null` + raison.** Jamais `0`, jamais `"ok"` par défaut.
6. **Aucun secret** dans les réponses, les labels de métriques ou les messages d'erreur.
7. **Cardinalité bornée.** Aucun label à valeur libre (id utilisateur, URL complète, message d'erreur brut).

## 2. Représentation de la fraîcheur

Chaque indicateur affiché par le Command Center porte :

| Champ | Type | Sens |
|---|---|---|
| `source` | chaîne | Code de source : `S1`…`S9` (CRM_SPEC §4), ou `ref:<chemin>` pour une donnée de référence versionnée dans le dépôt |
| `source_label` | chaîne | Libellé lisible, ex. « S5 · Prometheus · Node Exporter » |
| `fetched_at` | date-heure ou `null` | Dernière lecture réussie |
| `freshness` | `live` · `stale` · `unknown` · `static` | `live` si âge ≤ 2 × fréquence attendue ; `stale` au-delà ; `unknown` si jamais mesuré ou source non connectée ; `static` pour une donnée de référence (plan, spécification), jamais une mesure |
| `demo` | booléen | `true` si la valeur vient d'un jeu de démonstration |
| `unknown_reason` | chaîne ou `null` | `never_measured` · `source_disconnected` · `source_error` · `not_applicable` · `not_collected` |

Affichage : `freshness = unknown` → `—` + badge « Inconnu » + « jamais mesuré » ou âge de la dernière mesure. Voir [DESIGN_SYSTEM §6](../command-center/DESIGN_SYSTEM.md).

Schéma : [`freshness.schema.json`](../../packages/schemas/ops/freshness.schema.json).

Les réponses de lecture de l'API d'administration sont une **enveloppe plate** : ces champs plus `data` (`null` si la donnée est inconnue). Les champs `source_label` et `static` ont été ajoutés en v0.2 pour s'aligner sur le prototype CC-M1.

## 3. Endpoints attendus du backend applicatif (B)

| Endpoint | Accès | Contenu | Fréquence de lecture | Schéma |
|---|---|---|---|---|
| `GET /health` | public minimal | `{ "status": "ok" \| "degraded" \| "down" }` | 1 min (Uptime Kuma) | — |
| `GET /health/details` | VPN | Statut par dépendance (base, stockage objet, passerelle IA, file de synchro) | 1 min | [`service-health`](../../packages/schemas/ops/service-health.schema.json) |
| `GET /metrics` | VPN | Format d'exposition texte Prometheus | 30 s | §4 |
| `GET /version` | VPN | Version, commit, date de build, environnement | 5 min | [`deployment`](../../packages/schemas/ops/deployment.schema.json) |

Codes : `/health` répond `200` si `ok` ou `degraded`, `503` si `down`. Délai de réponse attendu : à définir avec B (proposition : sous 2 s, sinon la sonde considère le service `down`).

## 4. Métriques attendues

Noms au format Prometheus, préfixe `kaiviro_`. Les valeurs cibles et seuils d'alerte ne sont **pas** fixés ici. Ils seront décidés après mesure réelle (CC-M2).

| Métrique | Type | Labels autorisés | Source | Phase |
|---|---|---|---|---|
| `kaiviro_http_requests_total` | counter | `route` (gabarit), `method`, `status_class` | backend | CC-M2 |
| `kaiviro_http_request_duration_seconds` | histogram | `route`, `method` | backend | CC-M2 |
| `kaiviro_errors_total` | counter | `module`, `kind` (liste fermée) | backend | CC-M2 |
| `kaiviro_sync_batches_total` | counter | `result` (`ok`·`conflict`·`rejected`) | backend, synchro | CC-M2 |
| `kaiviro_sync_lag_seconds` | gauge | — | backend, synchro | CC-M2 |
| `kaiviro_db_up` | gauge (0/1) | — | backend | CC-M2 |
| `kaiviro_build_info` | gauge (1) | `version`, `commit`, `environment` | backend | CC-M2 |
| `kaiviro_ai_requests_total` | counter | `provider`, `model`, `result` | passerelle IA | M5 |
| `kaiviro_ai_request_duration_seconds` | histogram | `provider`, `model` | passerelle IA | M5 |
| `kaiviro_ai_quota_remaining_ratio` | gauge (0–1) | `provider` | passerelle IA | M5 |
| `kaiviro_ai_cost_estimate_eur_total` | counter | `provider` | passerelle IA | M5 |
| `kaiviro_ai_guardrail_blocks_total` | counter | `rule` (liste fermée) | passerelle IA | M5 |

Interdits dans les métriques IA : texte de prompt, texte de réponse, identifiant de conversation, identifiant d'utilisateur.

Métriques de la Pi : fournies par Node Exporter et cAdvisor, sans travail de B ([ADR-0010](../adr/ADR-0010-observabilite-et-pi.md)).

## 5. Versions déployées et événements de release

Un **événement de release** est émis à chaque déploiement d'un environnement.

| Champ | Forme |
|---|---|
| `component` | `backend` · `android` · `command-center` |
| `environment` | `dev` · `staging` · `production` |
| `version` | SemVer |
| `commit` | SHA complet |
| `released_at` | date-heure UTC |
| `released_by` | identifiant d'admin ou `ci` |
| `status` | `started` · `succeeded` · `failed` · `rolled_back` |

Source privilégiée : releases et déploiements GitHub (S1). Le backend expose `/version` pour confirmer ce qui tourne réellement. Écart entre les deux → alerte « version inconnue ou divergente ». Schéma : [`deployment.schema.json`](../../packages/schemas/ops/deployment.schema.json).

## 6. Erreurs agrégées

- Comptage par `module` et `kind` (liste fermée définie par B).
- Pas de trace de pile ni de message brut dans le Command Center. Les détails restent dans Loki (CC-M2), accessibles aux rôles Developer et plus.
- Les journaux envoyés à Loki sont filtrés : aucun jeton, aucune donnée personnelle, aucun contenu de conversation.

## 7. Indicateurs mobiles (Android)

Le mobile est offline-first. Il ne pousse rien vers la Pi. Indicateurs possibles, **sous réserve de consentement et de la classification de B** (`DATA_CLASSIFICATION.md`) :

| Indicateur | Forme | Source | Phase |
|---|---|---|---|
| Taux de plantage par version | agrégé quotidien | backend (remontée volontaire) | à définir par B |
| Répartition des versions installées | agrégé quotidien | backend | à définir par B |
| Taux de succès de connexion adaptateur | agrégé, sans modèle de véhicule | backend | à définir par B |

Si B ne les fournit pas, le Command Center affiche « non collecté » (`unknown_reason: not_collected`). Ce n'est pas une erreur.

## 8. Tableau récapitulatif

| Indicateur | Source | Fréquence | Dernière mise à jour | Inconnu |
|---|---|---|---|---|
| Disponibilité API | S4 Uptime Kuma | 1 min | `fetched_at` de la sonde | `—` « jamais sondé » |
| Santé des dépendances | S7 `/health/details` | 1 min | `checked_at` par dépendance | statut `unknown` |
| Latence, erreurs HTTP | S5 Prometheus ← `/metrics` | 30 s | horodatage du scrape | `—` « non exporté » |
| Version déployée | S1 + S7 `/version` | 5 min | `released_at` | « version inconnue » |
| Synchronisation | S5 ← `/metrics` | 30 s | horodatage du scrape | `—` |
| Pi : CPU, RAM, température, disque, throttling | S5 Node Exporter | 30 s | horodatage du scrape | `—` « Pi non installée » |
| Conteneurs | S5 cAdvisor | 30 s | horodatage du scrape | `—` |
| Dernière sauvegarde | S6 journal JSON | à chaque exécution | `finished_at` | « aucune sauvegarde connue » |
| IA : latence, erreurs, quotas, coût | S9 passerelle | 1 min | horodatage du scrape | « passerelle non connectée » |

## 9. Points ouverts pour B

- Liste fermée des `module` et `kind` d'erreur.
- Authentification de `/metrics` : jeton de scrape, mTLS ou filtrage réseau.
- Délai de réponse attendu de `/health`.
- Indicateurs mobiles retenus, consentement et durée de conservation.
- Nom exact des modules de synchronisation.
