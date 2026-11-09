---
name: network-security
description: Use when designing or reviewing KAIVIRO VPN, firewall, DNS or exposure rules. Goal is zero admin port exposed on the Internet.
---

# Sécurité réseau

Squelette (mission A, 2026-11-05).

## Lire d'abord

- `docs/operations/NETWORK_AND_VPN.md`
- `docs/security/THREAT_MODEL.md` (T-01, T-02)
- `infrastructure/network/nftables.conf`

## Règles

1. Entrée refusée par défaut. Ouverture justifiée ligne par ligne.
2. Services d'administration joignables par le VPN uniquement.
3. Penser au contournement du pare-feu par les ports publiés Docker.
4. Aucune clé privée VPN dans Git.
5. Toute règle proposée inclut une méthode de retour arrière.

## Contrôles

- Scan externe : attendu 0 port ouvert, ou seulement l'UDP WireGuard.
- `check-host.sh` : écoute limitée à `lo` et à l'IP VPN.

## À compléter

- Configuration VPN après décision WireGuard / Tailscale.
