---
title: Raspberry Pi 5 — centre d'administration
owner: mission-a
status: DRAFT
version: 0.1
updated: 2026-11-05
---

# Raspberry Pi 5 — centre d'administration

> Les instances Claude **ne se connectent jamais** à la Pi. Ce document et les fichiers de [`infrastructure/`](../../infrastructure/raspberry-pi/README.md) sont des propositions. **Johan seul** les relit et les applique.

Documents liés : [ADR-0010](../adr/ADR-0010-observabilite-et-pi.md) · [CONTAINERS](CONTAINERS.md) · [NETWORK_AND_VPN](NETWORK_AND_VPN.md) · [BACKUP_AND_RESTORE](BACKUP_AND_RESTORE.md) · [SECURITY_BASELINE](../security/SECURITY_BASELINE.md).

## 1. Rôle

- Supervision : sondes de disponibilité, métriques, tableaux de bord, journaux.
- Point d'entrée VPN d'administration (si WireGuard est retenu).
- Agent d'actions restreint (CC-M3).
- Exécution des sauvegardes de sa propre configuration.

## 2. Limites (ce que la Pi ne fait jamais)

- Aucune donnée d'utilisateur de l'app.
- Aucun service de production de l'app (API, base applicative, passerelle IA).
- Aucun port d'administration exposé sur Internet.
- Aucune dépendance critique de l'app : si la Pi tombe, l'app continue.

## 3. Services par étapes

| Étape | Services | Phase | Condition de passage |
|---|---|---|---|
| 0 | OS 64 bits sur SSD, durcissement, pare-feu, VPN, Docker | J7–J8 | Contrôles §5 au vert |
| 1 | Uptime Kuma | J9 / CC-M2 | Sondes publiques et VPN en place |
| 2 | Node Exporter, cAdvisor, Prometheus | CC-M2 | Consommation mesurée acceptable |
| 3 | Grafana | CC-M2 | Accès VPN seulement, comptes nominatifs |
| 4 | Loki (+ collecteur) | CC-M2+ | Filtrage des journaux validé (aucun secret) |
| 5 | ntfy (alertes) | CC-M2 | Sujet privé, accès authentifié |
| 6 | Agent d'actions | CC-M3 | ADR-0012 acceptée |

On n'ajoute une étape qu'après avoir mesuré l'effet de la précédente (CPU, RAM, température, disque).

## 4. Procédure d'installation (à appliquer par Johan)

Prérequis matériels à confirmer par Johan : modèle de RAM, SSD NVMe et carte M.2, alimentation officielle, refroidissement actif. Aucune référence n'est imposée ici.

### 4.1 Système

1. Avec Raspberry Pi Imager, écrire **Raspberry Pi OS Lite 64 bits** sur le SSD.
2. Dans les options de l'Imager : nom d'hôte `kaiviro-admin`, utilisateur nominatif (pas `pi`), **clé SSH publique uniquement**, pas de mot de passe SSH, Wi-Fi désactivé si câble Ethernet.
3. Configurer le démarrage sur SSD (outil `raspi-config`, ordre de boot), puis retirer la carte SD.
4. Premier démarrage, puis :

   ```bash
   sudo apt update && sudo apt full-upgrade -y
   sudo rpi-eeprom-update        # vérifier, appliquer si proposé
   sudo reboot
   ```

### 4.2 Comptes

- Un compte par humain (`johan`, `<collègue>`), clés SSH distinctes, groupe `kaiviro-admins`.
- `sudo` avec mot de passe local (pas de `NOPASSWD`).
- Aucun compte partagé, aucun compte de service avec shell.
- **Créer le groupe et y ajouter chaque admin avant l'étape 4.3** : sans cela, `AllowGroups kaiviro-admins` refuse toutes les connexions SSH.

  ```bash
  sudo groupadd kaiviro-admins
  sudo usermod -aG kaiviro-admins johan        # répéter pour chaque admin
  id johan                                     # doit afficher kaiviro-admins
  ```

### 4.3 SSH

- **Prérequis** : groupe `kaiviro-admins` créé et utilisateur ajouté (§4.2), vérifié avec `id`.
- Copier [`10-kaiviro-hardening.conf`](../../infrastructure/raspberry-pi/sshd_config.d/10-kaiviro-hardening.conf) dans `/etc/ssh/sshd_config.d/`.
- Vérifier avant de recharger, **en gardant une session ouverte** :

  ```bash
  sudo sshd -t && sudo systemctl reload ssh
  ```

- Tester une nouvelle connexion avant de fermer l'ancienne.

### 4.4 Pare-feu

- Proposition : nftables avec [`nftables.conf`](../../infrastructure/network/nftables.conf). Alternative : ufw.
- **Avant d'appliquer** : remplacer `LAN_ADMIN = { 192.0.2.10 }` par l'IP réelle du poste admin. `192.0.2.10` est une adresse d'exemple (TEST-NET) : laissée telle quelle, elle bloque SSH depuis le LAN tant que le VPN n'est pas actif. Adapter aussi `WAN_IF` et `VPN_IF`.
- Le fichier ne gère que la table `inet kaiviro_filter` et laisse passer le trafic des réseaux Docker. Il ne vide jamais les tables de Docker.
- Appliquer **depuis la console locale** ou avec le filet de sécurité décrit dans [`infrastructure/network/README.md`](../../infrastructure/network/README.md), qui retire la seule table KAIVIRO après 2 minutes.

### 4.5 Mises à jour

- `unattended-upgrades` pour les correctifs de sécurité Debian.
- Mises à jour majeures et images Docker : manuelles, après lecture des notes de version ([CONTAINERS §5](CONTAINERS.md)).

### 4.6 VPN

Selon la décision [NETWORK_AND_VPN](NETWORK_AND_VPN.md). Vérifier ensuite qu'aucun service d'administration n'écoute ailleurs que sur `lo` ou l'interface VPN.

### 4.7 Docker

- Installer Docker Engine depuis le dépôt officiel Docker pour Debian (pas le script `get.docker.com` sans relecture).
- Ne pas ajouter les admins au groupe `docker` (équivaut à root) : utiliser `sudo docker`.
- Déployer les étapes du §3 avec [`infrastructure/monitoring/compose.yaml`](../../infrastructure/monitoring/compose.yaml).

## 5. Contrôles après chaque étape

Script en lecture seule : [`check-host.sh`](../../infrastructure/raspberry-pi/scripts/check-host.sh).

| Contrôle | Attendu |
|---|---|
| Architecture | `aarch64` |
| Système de fichiers racine | sur le SSD NVMe |
| SSH | mot de passe refusé, root refusé |
| Pare-feu | actif, politique d'entrée `drop` |
| Ports en écoute | uniquement `lo`, interface VPN, SSH sur LAN si choisi |
| Docker | ports publiés liés à l'IP VPN uniquement |
| Throttling | `vcgencmd get_throttled` = `throttled=0x0` |
| Sauvegarde | dernière exécution réussie, test de restauration réussi |

Résultats à consigner par Johan dans le rapport ou une issue `ops`.
