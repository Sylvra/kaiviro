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

Avant d'appliquer :

1. Remplacer `LAN_ADMIN = { 192.0.2.10 }` par l'IP **réelle** du poste admin. `192.0.2.10` est une adresse d'exemple (TEST-NET-1) : laissée telle quelle, elle bloque SSH depuis le LAN dès que le VPN n'est pas actif.
2. Adapter `WAN_IF` et `VPN_IF` (`ip -br link`).

Le fichier ne gère **que** la table `inet kaiviro_filter`. Il ne vide jamais tout le jeu de règles, pour ne pas supprimer les tables de Docker. La chaîne `forward` laisse passer le trafic des réseaux Docker et refuse le routage du VPN vers le LAN.

Retour arrière conseillé pendant le test :

```bash
sudo cp /etc/nftables.conf /etc/nftables.conf.bak
sudo nft -c -f /etc/nftables.conf                                  # vérification de syntaxe
( sleep 120 && sudo nft delete table inet kaiviro_filter ) &       # filet de 2 minutes : retire la seule table KAIVIRO
SAFETY_PID=$!
sudo nft -f /etc/nftables.conf
# si l'accès est conservé (nouvelle session SSH testée) : annuler le filet avant 2 minutes
kill "$SAFETY_PID"
```

Après application : vérifier que les conteneurs répondent toujours (Uptime Kuma via le VPN, sondes sortantes) et que `sudo nft list tables` montre encore les tables de Docker.
