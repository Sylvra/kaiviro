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
| [`.env.example`](.env.example) | Variables attendues, sans valeur réelle |

Installation proposée sur la Pi : `/opt/kaiviro/backups/`, `.env` en `root:root 0600`, exécution par un timer systemd quotidien (unité à écrire après validation de l'outil).

L'état est écrit dans `/var/lib/kaiviro/backup-state/` au format [`backup-run.schema.json`](../../packages/schemas/ops/backup-run.schema.json).
