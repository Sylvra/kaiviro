---
title: Gestion des accès
owner: mission-a
status: DRAFT
version: 0.1
updated: 2026-11-05
---

# Gestion des accès

Création, revue et révocation des accès aux systèmes d'administration. Registre proposé dans le CRM ([CRM_SPEC §5.7](../command-center/CRM_SPEC.md)).

## 1. Principes

- **Comptes nominatifs** partout. Aucun compte partagé.
- **MFA** partout où c'est possible.
- **Moindre privilège** : rôle minimal, portée minimale, durée limitée pour les accès temporaires.
- **Deux humains** : toute création d'accès Owner ou équivalent est validée par l'autre.
- **Aucun accès** pour les instances Claude hors de leur worktree et de leur branche.

## 2. Systèmes couverts

| Système | Accès | MFA | Créé par | Revue |
|---|---|---|---|---|
| GitHub (`Sylvra/kaiviro`) | Collaborateur du dépôt | obligatoire | propriétaire du compte | trimestrielle |
| VPN | Pair WireGuard ou appareil Tailscale, un par appareil | via identité si Tailscale | Johan | trimestrielle |
| Pi (SSH) | Compte Unix nominatif + clé | clé + phrase de passe | Johan | trimestrielle |
| Grafana, Uptime Kuma | Compte nominatif | si disponible | Johan | trimestrielle |
| Cloud (hébergeurs ADR-0004, ADR-0014) | Compte nominatif, rôle minimal | obligatoire | humains | trimestrielle |
| Command Center | Compte admin + rôle (ADMIN_PERMISSIONS) | obligatoire | Owner (N3) | trimestrielle |
| Coffre de secrets | Les deux humains | obligatoire | humains | semestrielle |

## 3. Création

1. Demande écrite (issue `access`, sans secret) : qui, quel système, quel rôle, pourquoi, jusqu'à quand.
2. Validation par un Owner autre que le demandeur.
3. Création avec le rôle minimal. MFA activée avant tout usage.
4. Inscription au registre (date, accordé par, rôle).

## 4. Revue trimestrielle

- Lister les accès réels de chaque système et comparer au registre.
- Retirer tout accès inutilisé depuis 90 jours ou sans justification.
- Vérifier MFA activée.
- Consigner la date de revue (`last_review_at`).

## 5. Révocation

Déclencheurs : départ, changement de rôle, appareil perdu, soupçon de compromission.

1. Retirer l'accès dans chaque système (liste §2).
2. Révoquer les clés SSH, pairs VPN, jetons associés.
3. Faire tourner les secrets partagés que la personne a pu voir (ADR-0011).
4. Mettre à jour le registre (`revoked_at`).
5. Vérifier le journal d'audit des 30 derniers jours.

## 6. Procédure d'urgence (bris de glace)

Cas : les deux Owners perdent l'accès au Command Center, ou un compte est compromis.

- Un accès de secours par système (codes de récupération GitHub, accès console locale à la Pi, compte cloud racine) est conservé **dans le coffre**, jamais ailleurs.
- Usage : prévenir l'autre humain, utiliser, puis faire tourner les identifiants de secours et ouvrir un incident.
- Test de l'accès de secours : une fois par semestre, sans l'utiliser réellement si possible (vérifier sa présence et sa validité).

## 7. Appareil perdu

1. Révoquer le pair VPN de l'appareil.
2. Révoquer la clé SSH de l'appareil.
3. Fermer les sessions GitHub, cloud et Command Center.
4. Incident SEV2 au minimum.
