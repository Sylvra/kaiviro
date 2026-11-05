---
title: Réseau et VPN d'administration
owner: mission-a
status: DRAFT
version: 0.1
updated: 2026-11-05
---

# Réseau et VPN d'administration

Règle : **aucun port d'administration exposé sur Internet**. Command Center, API admin, Grafana, Uptime Kuma, Prometheus et SSH ne sont joignables que par le VPN.

Documents liés : [ADR-0012](../adr/ADR-0012-command-center-acces.md) · [RASPBERRY_PI_ADMIN_CENTER](RASPBERRY_PI_ADMIN_CENTER.md) · [`infrastructure/network/`](../../infrastructure/network/README.md).

## 1. Comparatif Tailscale / WireGuard

| Critère | WireGuard natif | Tailscale | Headscale (Tailscale auto-hébergé) |
|---|---|---|---|
| Logiciel | Libre (noyau Linux, GPLv2 ; outils et clients libres) | Client open source (BSD-3) ; serveur de coordination propriétaire | Serveur libre (BSD-3) + clients Tailscale |
| Compte tiers | Aucun | Compte Tailscale (fournisseur d'identité externe) | Aucun |
| Coût | Gratuit | Offre personnelle gratuite (conditions à vérifier au moment du choix) | Gratuit |
| Exposition | Un port UDP ouvert sur la box vers la Pi (silencieux sans clé valide) | Aucun port entrant (traversée NAT) | Serveur de coordination à exposer quelque part |
| CGNAT chez le FAI | Bloquant sans relais externe | Fonctionne | Dépend de l'emplacement du serveur |
| Administration | Clés et configurations à la main, ajout de pair manuel | Console web, ACL, MFA via l'identité | Ligne de commande, ACL |
| Accès mobile | Applications officielles Android et iOS | Applications officielles | Applications Tailscale configurables |
| Confiance | Tout chez nous | Métadonnées chez Tailscale (trafic chiffré de bout en bout) | Tout chez nous |
| Risques | Erreur de configuration manuelle ; port UDP ouvert | Dépendance à un tiers, changement de conditions | Maintenance d'un service de plus, à héberger hors Pi idéalement |

### Proposition

1. **WireGuard natif** si la box permet la redirection d'un port UDP (pas de CGNAT). Aucun compte, aucun tiers, conforme à « aucun compte cloud ».
2. **Tailscale** en repli si CGNAT ou si l'administration manuelle devient un frein. Création du compte par les humains seulement.
3. Headscale écarté en M0 : il faut l'héberger, ce qui recrée le problème.

Information à relever par Johan : CGNAT ou IP publique, modèle de box et possibilité de redirection UDP.

## 2. Plan d'adressage (proposition)

| Plage | Usage |
|---|---|
| LAN domestique | à relever par Johan, non modifié |
| `10.77.0.0/24` | Tunnel WireGuard d'administration |
| `10.77.0.1` | Pi (serveur WireGuard, `BIND_ADDR` des services) |
| `10.77.0.10–19` | Postes de Johan |
| `10.77.0.20–29` | Postes du collègue |
| `10.77.0.30–39` | Téléphones admin |
| `172.30.10.0/24` | Réseau Docker `kv_monitoring` |
| `172.30.20.0/24` | Réseau Docker `kv_edge` |

À vérifier : aucune collision avec le LAN de chaque admin.

## 3. DNS interne

- Proposition : noms en `*.kaiviro.internal` résolus via le VPN (Pi-hole ou `dnsmasq` sur la Pi, ou MagicDNS si Tailscale).
- Exemple : `status.kaiviro.internal` (Uptime Kuma), `grafana.kaiviro.internal`.
- Pas de nom public pour ces services. Le domaine `.internal` est réservé à l'usage privé.

## 4. TLS interne

- Option A : HTTP dans le tunnel chiffré, accepté en CC-M2 pour les outils de supervision.
- Option B : autorité de certification interne (ex. `step-ca`), à étudier pour le Command Center.
- Pas de certificat public pour un nom interne.

## 5. Pare-feu (principe)

- Entrée par défaut : refusée.
- Autorisé : trafic établi, `lo`, UDP WireGuard sur l'interface WAN (si WireGuard), SSH depuis `wg0` (et LAN admin le temps de l'installation), services de supervision depuis `wg0`.
- **Piège Docker** : un port publié par Docker contourne les règles d'entrée classiques. D'où la règle : ports publiés liés à `${BIND_ADDR}` uniquement.

Proposition : [`nftables.conf`](../../infrastructure/network/nftables.conf).

## 6. Contrôle « zéro port exposé »

- Depuis l'extérieur (réseau mobile, VPN coupé) : scanner l'IP publique avec un outil choisi par Johan. Attendu : rien d'ouvert, ou seulement le port UDP WireGuard.
- Résultat affiché dans Infrastructure · Réseau (« ports exposés : 0 ») avec date du dernier scan.
