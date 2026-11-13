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
| [`scripts/install-supervision.sh`](scripts/install-supervision.sh) | Lancé une fois avec `sudo` | Étape 2 sans Docker : Node Exporter et Prometheus (paquets Debian), publiés sur le tailnet seulement. Appliqué le 2026-11-12. |
| [`scripts/install-sauvegardes.sh`](scripts/install-sauvegardes.sh) | Lancé une fois avec `sudo`, à côté des scripts de [`../backups/`](../backups/README.md) | restic, dépôt chiffré sur le SSD, sauvegarde quotidienne de `pi-config`, test de restauration mensuel. Appliqué le 2026-11-12. |
| [`scripts/install-copie-drive.sh`](scripts/install-copie-drive.sh) | Lancé une fois avec `sudo`, après le précédent | Copie hors site chiffrée sur Google Drive (rclone), sauvegarde quotidienne à 04:15, test mensuel depuis Drive |
| [`scripts/install-posture.sh`](scripts/install-posture.sh) | Lancé une fois avec `sudo` | Relevé horaire de la posture de sécurité (SSH, ports, pare-feu, mises à jour), lecture seule, publié pour NEXUS |
| [`scripts/rotation-mot-de-passe.sh`](scripts/rotation-mot-de-passe.sh) | Lancé avec `sudo` en cas d’exposition du mot de passe | Nouvelle clé restic sur les deux dépôts, vérification, retrait de l’ancienne, contrôle par sauvegarde et test |

Autres dossiers : [`../monitoring/`](../monitoring/README.md), [`../network/`](../network/README.md), [`../backups/`](../backups/README.md).
