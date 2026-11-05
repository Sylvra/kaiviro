---
title: ADR-0011 — Secrets et accès
owner: mission-a
status: PROPOSED
version: 0.1
updated: 2026-11-05
---

# ADR-0011 — Secrets et accès

Statut : PROPOSED
Date : 2026-11-05
Propriétaire : mission-a
Relecteur : humains

## Contexte

Usage actuel décrit par le plan M0 (arbitrage 9) : un **dossier Drive restreint aux deux humains**, hors Git et hors vault Obsidian, contient les credentials du projet. Les instances Claude ne lisent, n'ouvrent ni ne référencent jamais ce dossier. Cet ADR ne contient et ne demande **aucun** secret.

Besoins à venir : jetons GitHub serveur (API admin), clés WireGuard, mot de passe des dépôts de sauvegarde, comptes Grafana et ntfy, identifiants cloud (ADR-0004, ADR-0014), jeton de scrape `/metrics`.

## Options étudiées

| Option | Avantages | Limites | Coûts | Licences |
|---|---|---|---|---|
| Dossier Drive restreint (actuel) | Déjà en place, partagé entre deux humains | Fichiers en clair dans un service synchronisé, pas de journal d'accès fin, pas de rotation | 0 € | — |
| **Coffre chiffré local partagé : KeePassXC + fichier `.kdbx`** (proposé pour M0–CC-M2) | Chiffré, hors ligne, libre, MFA possible par fichier clé | Synchronisation du fichier à gérer, conflits possibles | 0 € | GPLv3 |
| Bitwarden (offre gratuite) ou Vaultwarden auto-hébergé | Partage simple, applications mobiles | Compte tiers (Bitwarden) ou service de plus à héberger (Vaultwarden) | 0 € (gratuit) | GPL / AGPL |
| SOPS + age dans Git | Secrets chiffrés versionnés à côté de la config | Clés age à protéger ; une erreur = secret en clair dans Git | 0 € | MPL-2.0 / BSD-3 |
| Secrets de l'hébergeur (GitHub Actions, Vercel, Supabase) | Natif pour la CI et le runtime | Dispersé, pas un coffre de référence | inclus | propriétaire |

## Proposition

1. **Cible M0–CC-M2** : coffre KeePassXC (`.kdbx`) chiffré, ouvert par mot de passe fort + fichier clé, une copie chez chaque humain. Le fichier `.kdbx` peut être stocké dans le dossier Drive restreint actuel : il y est chiffré. `*.kdbx` est déjà dans `.gitignore`.
2. **Runtime** : chaque service lit ses secrets depuis un fichier local `0400` ou le gestionnaire de secrets de son hébergeur. Jamais en variable versionnée.
3. **CI** : aucun secret en M0. Plus tard, secrets d'environnement GitHub à portée minimale.
4. **Rotation** : à chaque départ ou soupçon, et au moins une fois par an pour les jetons à longue durée. Date de dernière rotation notée dans le coffre.
5. **Comptes nominatifs, MFA** partout ([ACCESS_MANAGEMENT](../security/ACCESS_MANAGEMENT.md)).
6. **Bris de glace** : codes de récupération dans le coffre seulement.
7. Réévaluer Vaultwarden ou SOPS au-delà de deux humains.

## Conséquences

- La migration du dossier Drive vers le coffre est faite **par les humains**, sans aide d'une instance Claude.
- Chaque nouveau secret a un propriétaire, une portée, une date d'émission et une date de rotation.
- Perte du fichier clé et du mot de passe = perte des secrets : copie de secours dans deux lieux.

## Points ouverts

- Validation du choix KeePassXC par les deux humains.
- Emplacement des copies de secours du fichier clé.
- Fréquence de rotation par type de secret.
