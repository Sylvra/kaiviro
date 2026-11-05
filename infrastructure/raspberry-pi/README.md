---
title: Raspberry Pi — fichiers proposés
owner: mission-a
status: DRAFT
version: 0.1
updated: 2026-11-05
---

# Raspberry Pi — fichiers proposés

> Propositions. Aucune instance Claude n'accède à la Pi. **Johan relit et applique.**

Procédure complète : [RASPBERRY_PI_ADMIN_CENTER](../../docs/operations/RASPBERRY_PI_ADMIN_CENTER.md).

| Fichier | Destination sur la Pi | Rôle |
|---|---|---|
| [`sshd_config.d/10-kaiviro-hardening.conf`](sshd_config.d/10-kaiviro-hardening.conf) | `/etc/ssh/sshd_config.d/` | Durcissement SSH |
| [`scripts/check-host.sh`](scripts/check-host.sh) | `/opt/kaiviro/scripts/` | Contrôles en lecture seule après chaque étape |

Autres dossiers : [`../monitoring/`](../monitoring/README.md), [`../network/`](../network/README.md), [`../backups/`](../backups/README.md).
