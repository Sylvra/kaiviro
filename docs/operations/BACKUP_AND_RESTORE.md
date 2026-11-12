---
title: Sauvegarde et restauration
owner: mission-a
status: DRAFT
version: 0.1
updated: 2026-11-05
---

# Sauvegarde et restauration

Une sauvegarde n'existe que si sa **restauration a été testée**. La recette M0 exige une sauvegarde **et** une restauration de test réussie.

Scripts proposés : [`infrastructure/backups/`](../../infrastructure/backups/README.md). État écrit au format [`backup-run`](../../packages/schemas/ops/backup-run.schema.json) (source S6).

## 1. Outil proposé

| Option | Avantages | Limites | Licence |
|---|---|---|---|
| **restic** (proposé) | Chiffrement par défaut, déduplication, nombreux backends, vérification intégrée | Mot de passe du dépôt à garder hors de la Pi aussi | BSD-2-Clause |
| BorgBackup | Mature, compression, déduplication | Backends distants limités (SSH) | BSD-3-Clause |
| rsync + tar chiffré | Simple | Pas de déduplication, chiffrement à gérer soi-même | GPLv3 |

Version relevée : restic `0.19.1` (release GitHub du 05/07/2026). Installer depuis les paquets Debian ou le binaire officiel vérifié.

## 2. Périmètre

| Périmètre (`scope`) | Contenu | Fréquence proposée |
|---|---|---|
| `pi-config` | `/etc/ssh/sshd_config.d/`, `/etc/nftables.conf`, `/etc/wireguard/` (**clés privées incluses, dépôt chiffré obligatoire**), `/opt/kaiviro/` | quotidienne |
| `pi-monitoring-data` | volumes `uptime_kuma_data`, `grafana_data` | quotidienne |
| `admin-db` | schéma `admin` (CRM, incidents, audit) | dépend de l'hébergeur (ADR-0004, B) |

Hors périmètre : séries Prometheus et journaux Loki (reconstructibles, rétention courte), données de l'app (mission B).

Mise à jour du 2026-11-12, selon la Pi réelle (sans WireGuard, nftables ni Docker) :

- `pi-config` couvre `/etc/ssh/sshd_config.d`, `/etc/prometheus`, `/etc/default/prometheus*`, `/etc/systemd/system` et `/opt/kaiviro`, s'ils existent.
- Les clés Tailscale ne sont pas sauvegardées : une nouvelle connexion au tailnet suffit.
- `pi-monitoring-data` attend Uptime Kuma et Grafana, qui ne sont pas installés.

## 3. Chiffrement et secrets

- Dépôts restic chiffrés (AES-256 côté restic).
- Mot de passe du dépôt : coffre des humains (ADR-0011), **jamais** dans Git ni dans le vault. Sur la Pi : fichier `root:root` `0400`, chemin dans `.env` local.
- Copie du mot de passe hors de la Pi obligatoire : sans lui, la sauvegarde est perdue.

## 4. Destinations (règle 3-2-1)

| Copie | Support | Emplacement |
|---|---|---|
| 1 | SSD de la Pi | données vivantes |
| 2 | Disque USB dédié | même lieu, monté le temps de la sauvegarde |
| 3 | Hors site | **Google Drive de Johan** (décision du 2026-11-12, espace déjà disponible, aucun coût nouveau). Dépôt restic chiffré `KAIVIRO-BACKUPS/restic` via rclone |

## 5. Rétention proposée

`restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune`, puis `restic check` hebdomadaire.

## 6. Procédure de test de restauration

À faire **avant** de déclarer M0 terminé, puis une fois par mois.

1. Lancer [`restore-test.sh`](../../infrastructure/backups/restore-test.sh) : il restaure le dernier instantané dans un dossier temporaire, jamais à l'emplacement d'origine.
2. Le script compare les sommes de contrôle de fichiers témoins (liste dans `.env`) avec l'original.
3. Pour les volumes : démarrer une copie d'Uptime Kuma sur le volume restauré, sur un port local non exposé, et vérifier la présence des sondes.
4. Le script écrit un état `kind: restore_test` avec `restore_verified: true|false`.
5. Johan note le résultat (date, durée, écarts) dans une issue `ops`.

Critère de réussite : fichiers témoins identiques et service redémarré sur les données restaurées.

## 7. Restauration réelle (Pi perdue)

1. Réinstaller selon [RASPBERRY_PI_ADMIN_CENTER §4](RASPBERRY_PI_ADMIN_CENTER.md).
2. Installer restic, récupérer le mot de passe du dépôt dans le coffre.
3. `restic restore latest --target /` pour `pi-config` (après relecture), volumes ensuite.
4. Redémarrer les services, lancer `check-host.sh`.
5. Déclarer et clore un incident avec post-mortem.

## 8. Supervision

- Le Command Center affiche dernière sauvegarde, résultat et dernier test de restauration (S6).
- Alerte si aucune sauvegarde réussie depuis plus de 48 h ou aucun test réussi depuis plus de 35 jours (proposition).
