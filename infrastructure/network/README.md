---
title: Réseau — fichiers proposés
owner: mission-a
status: DRAFT
version: 0.1
updated: 2026-11-05
---

# Réseau — fichiers proposés

> Propositions. **Johan relit et applique.** Appliquer un pare-feu depuis la console locale, ou avec un retour arrière programmé.

| Fichier | Destination | Rôle |
|---|---|---|
| [`nftables.conf`](nftables.conf) | `/etc/nftables.conf` | Pare-feu de la Pi : entrée refusée par défaut |

Configuration WireGuard : non fournie tant que le choix WireGuard / Tailscale n'est pas tranché ([NETWORK_AND_VPN](../../docs/operations/NETWORK_AND_VPN.md)). Les clés privées ne sont **jamais** dans Git.

Retour arrière conseillé pendant le test :

```bash
sudo cp /etc/nftables.conf /etc/nftables.conf.bak
sudo nft -c -f /etc/nftables.conf          # vérification de syntaxe
( sleep 120 && sudo nft flush ruleset ) &   # filet de sécurité de 2 minutes
sudo nft -f /etc/nftables.conf
# si l'accès est conservé : tuer la tâche de fond avant 2 minutes
```
