---
title: Sauvegardes — fichiers proposés
owner: mission-a
status: DRAFT
version: 0.1
updated: 2026-11-05
---

# Sauvegardes — fichiers proposés

> Propositions. **Johan relit et applique.** Procédure : [BACKUP_AND_RESTORE](../../docs/operations/BACKUP_AND_RESTORE.md).

| Fichier | Rôle |
|---|---|
| [`backup.sh`](backup.sh) | Sauvegarde restic d'un périmètre, rétention, écriture de l'état S6 |
| [`restore-test.sh`](restore-test.sh) | Restauration dans un dossier temporaire et vérification de fichiers témoins |
| [`metriques.sh`](metriques.sh) | Métriques pour Node Exporter (collecteur textfile) : NEXUS lit l'état S6 via Prometheus |
| [`.env.example`](.env.example) | Variables attendues, sans valeur réelle |

Installation : [`install-sauvegardes.sh`](../raspberry-pi/scripts/install-sauvegardes.sh), lancé par Johan avec `sudo`.

- Scripts dans `/opt/kaiviro/backups/`, `.env` en `root:root 0600`.
- Mot de passe du dépôt dans `/etc/kaiviro/restic.pass` (`0400`). À copier dans le gestionnaire de mots de passe.
- Dépôt chiffré sur le SSD (`/srv/kaiviro-backups/restic`), un autre disque que le système.
- Timers : `kaiviro-backup.timer` chaque jour à 03:30, `kaiviro-restore-test.timer` le 1er du mois à 04:30.

L'état est écrit dans `/var/lib/kaiviro/backup-state/` au format [`backup-run.schema.json`](../../packages/schemas/ops/backup-run.schema.json).
