---
title: Socle de sécurité (infrastructure et administration)
owner: mission-a
status: DRAFT
version: 0.1
updated: 2026-11-05
---

# Socle de sécurité

Périmètre : infrastructure, Command Center, API d'administration, CI, organisation GitHub. La sécurité de l'application relève de B (`APP_SECURITY.md`, `DATA_CLASSIFICATION.md`).

Documents liés : [THREAT_MODEL](THREAT_MODEL.md) · [ADMIN_PERMISSIONS](ADMIN_PERMISSIONS.md) · [ACCESS_MANAGEMENT](ACCESS_MANAGEMENT.md) · [ADR-0011](../adr/ADR-0011-secrets-et-acces.md) · [ADR-0012](../adr/ADR-0012-command-center-acces.md).

## 1. Exigences minimales

| # | Domaine | Exigence | Vérification |
|---|---|---|---|
| S-01 | Secrets | Aucun secret dans Git, les prompts, les journaux, les issues | Scan de secrets en CI + `.gitignore` |
| S-02 | Secrets | Coffre des humains, accès nominatif, rotation documentée | ADR-0011 |
| S-03 | Identité | Comptes nominatifs partout, aucun compte partagé | Revue trimestrielle (ACCESS_MANAGEMENT) |
| S-04 | Identité | MFA sur GitHub, VPN (si compte), cloud, Command Center | Revue trimestrielle |
| S-05 | Réseau | Aucun port d'administration exposé sur Internet | Scan externe mensuel |
| S-06 | Réseau | Pi : pare-feu entrée `drop`, SSH par clé, pas de root | `check-host.sh` |
| S-07 | Conteneurs | Images épinglées par tag et digest, pas de `latest` | Revue de PR |
| S-08 | Conteneurs | Pas de `privileged`, pas de socket Docker en écriture | Revue de PR |
| S-09 | Admin | Autorisations côté serveur, actions en liste blanche | Tests de contrat (CC-M3) |
| S-10 | Admin | Journal d'audit en ajout seul pour N2 et N3 | Tests (CC-M3) |
| S-11 | CI | Actions GitHub épinglées par SHA, permissions `contents: read` par défaut | Revue de PR |
| S-12 | CI | Aucun déploiement depuis la CI en M0 | Revue des workflows |
| S-13 | Dépendances | Licence, maintenance et validation humaine avant ajout | Revue de PR |
| S-14 | Sauvegardes | Chiffrées, hors site, restauration testée mensuellement | État S6 |
| S-15 | Agents IA | Aucun accès en écriture à la production ni à l'API admin | THREAT_MODEL |
| S-16 | Données | Command Center : agrégats seulement, jamais de conversation | OBSERVABILITY_CONTRACT |

## 2. Organisation GitHub

- Dépôt privé `Sylvra/kaiviro` sur compte personnel GitHub Free.
- **Protection des branches indisponible** (HTTP 403 pour un dépôt privé sur GitHub Free). Compensations :
  - règle écrite : PR obligatoire vers `develop`, fusion par un humain (CLAUDE.md §4) ;
  - hook local `pre-push` qui bloque les pushes vers `main` et `develop` (installé par les humains dans chaque clone) ;
  - CODEOWNERS indicatif ;
  - options pour la suite dans [ADR-0001](../adr/ADR-0001-monorepo-et-collaboration.md).
- Secret scanning et push protection GitHub : disponibilité à vérifier pour un dépôt privé sur l'offre actuelle. En attendant : scan en CI.

## 3. Postes des administrateurs

- Disque chiffré, verrouillage automatique, mises à jour automatiques.
- Clés SSH protégées par phrase de passe, une clé par poste.
- Aucun dépôt Git ni worktree dans un dossier synchronisé par Google Drive (CLAUDE.md §5).

## 4. Instances Claude Code

- Travail limité à leur worktree et leur branche.
- Pas d'accès à la Pi, au coffre, au dossier Drive des credentials, aux comptes cloud.
- Pas de jeton GitHub à droits d'administration dans leur environnement (recommandation).
- Toute sortie relue par un humain avant fusion.

## 5. Revue

Ce socle est revu à chaque jalon (CC-M1, CC-M2…) et après tout incident SEV1 ou SEV2.
