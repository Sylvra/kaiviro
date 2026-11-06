---
name: raspberry-pi-ops
description: Use when drafting documentation, Compose files or scripts for the KAIVIRO admin Raspberry Pi 5. Claude never connects to the Pi; output is a proposal Johan reviews and applies.
---

# Raspberry Pi — opérations

Squelette (mission A, 2026-11-05).

## Interdit

- Se connecter à la Pi (SSH, VPN, API), lancer une commande dessus, la modifier.
- Écrire une valeur réelle (IP publique, clé, mot de passe) dans un fichier.

## Lire d'abord

- `docs/operations/RASPBERRY_PI_ADMIN_CENTER.md`, `CONTAINERS.md`, `NETWORK_AND_VPN.md`, `BACKUP_AND_RESTORE.md`
- `docs/adr/ADR-0010-observabilite-et-pi.md`
- `infrastructure/raspberry-pi/`, `infrastructure/monitoring/`

## Règles

1. Chaque fichier proposé commence par un commentaire « proposé, à appliquer par Johan ».
2. Images Docker : tag exact + digest à ajouter, jamais `latest`.
3. Ports publiés liés à `${BIND_ADDR}` (IP VPN) uniquement.
4. Scripts : lecture seule par défaut ; tout effet de bord documenté et réversible.
5. `.env.example` sans valeur réelle.
6. La Pi ne porte jamais de production ni de donnée utilisateur.

## À compléter

- Procédure de mise à jour des digests, unités systemd validées.
