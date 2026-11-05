---
title: "ADR-0012 — Command Center : accès et autorisations"
owner: mission-a
status: PROPOSED
version: 0.1
updated: 2026-11-05
---

# ADR-0012 — Command Center : accès et autorisations

Statut : PROPOSED
Date : 2026-11-05
Propriétaire : mission-a
Relecteur : mission-b + humains

## Contexte

Le Command Center donne une vue sur l'infrastructure et, à partir de CC-M3, des actions. Il manipule des données personnelles de partenaires (CRM). Il doit être privé, autorisé côté serveur et entièrement journalisé.

## Options étudiées

### Accès réseau

| Option | Avantages | Limites | Coûts |
|---|---|---|---|
| **VPN privé** (WireGuard ou Tailscale, NETWORK_AND_VPN) (proposé) | Rien d'exposé, même modèle que la Pi | Le VPN doit être actif pour administrer | 0 € |
| Public + authentification forte | Accessible partout | Surface d'attaque publique, cible pour le bourrage d'identifiants | 0 € |
| Proxy d'accès d'un fournisseur (Cloudflare Access…) | Pas de client VPN | Compte tiers, dépendance | gratuit limité |

### Authentification

| Option | Avantages | Limites |
|---|---|---|
| **Fournisseur d'identité du backend (B) avec rôle admin séparé + MFA TOTP/WebAuthn** (proposé) | Une seule pile d'auth | Dépend du choix de B (ADR-0004) |
| Identité GitHub (OAuth) | Les admins ont déjà GitHub + MFA | Lie l'accès admin à GitHub ; scopes à minimiser |
| Comptes locaux dédiés | Indépendant | Une pile d'auth de plus à maintenir |

## Proposition

1. **Accès réseau par VPN uniquement** pour le Command Center et l'API admin.
2. **Authentification** : comptes admin nominatifs distincts des comptes utilisateurs de l'app, MFA obligatoire (WebAuthn de préférence, TOTP en repli). Fournisseur à trancher avec B.
3. **Session** : cookie HttpOnly, Secure, SameSite=Strict ; durée courte (proposition : 8 h, inactivité 30 min).
4. **Autorisation côté serveur** : rôles et niveaux de [ADMIN_PERMISSIONS](../security/ADMIN_PERMISSIONS.md), vérifiés par l'API à chaque requête.
5. **Actions par niveaux** : N1 libre selon rôle ; N2 liste blanche + motif + confirmation ; N3 + MFA récente + saisie de la ressource.
6. **Audit** en ajout seul de toute action N2/N3 et de tout refus.
7. **Aucun agent IA** n'a de compte ni de jeton sur l'API admin. L'assistant d'administration (CC-M5) sera en lecture seule.

## Conséquences

- CC-M1 peut démarrer sur données de démonstration avec une authentification simplifiée **uniquement en local**, jamais exposée.
- B doit prévoir dans le backend : rôle admin séparé, MFA, journal d'audit (attentes dans le rapport de mission A).
- Le VPN devient un prérequis de l'administration au quotidien.

## Points ouverts

- Fournisseur d'identité admin (B ou dédié).
- Double validation par le second Owner pour certaines actions N3.
- Hébergement du Command Center (ADR-0014) : il conditionne la façon d'appliquer « VPN uniquement ».
