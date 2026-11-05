---
title: ADR-0015 — CRM d'administration et template tiers
owner: mission-a
status: PROPOSED
version: 0.1
updated: 2026-11-05
---

# ADR-0015 — CRM d'administration et template tiers

Statut : PROPOSED
Date : 2026-11-05
Propriétaire : mission-a
Relecteur : humains

## Contexte

Les humains veulent un back-office premium pour piloter le projet à deux, intégré au Command Center. Ils ont acheté (ou vont acheter) un template commercial de style dashboard (Next.js + Tailwind + Framer Motion), qui sert de base visuelle et de composants. Ce template **n'est pas un CRM**. Sa licence n'a pas été lue par la mission A : aucune instance Claude ne lit, ne télécharge ni ne recopie le code du template. KAIVIRO est décrit comme « open source » dans le README, mais le dépôt est actuellement privé.

## Options étudiées

### Périmètre

Détail dans [CRM_SPEC §5.0](../command-center/CRM_SPEC.md) : pilotage du projet, partenaires et contacts, registre des accès et du matériel de test, retours et support agrégés.

### Hébergement du CRM

| Option | Avantages | Limites |
|---|---|---|
| **Intégré au Command Center, données dans le schéma `admin`** (proposé) | Une seule interface, mêmes permissions et audit | Dépend du backend de B |
| Outil CRM tiers (SaaS) | Rien à développer | Compte cloud, données personnelles chez un tiers, souvent payant |
| Tableur partagé | Immédiat | Pas de permissions fines, pas d'audit, risque de diffusion |

### Code du template et licence

| Option | Avantages | Limites | Risques |
|---|---|---|---|
| A. Isolation dans `apps/command-center/vendor/<nom>/` (dépôt privé) | Simple, conforme à CLAUDE.md §3.11 | Incompatible avec un dépôt public : le dossier devrait être retiré **et purgé de l'historique** | Redistribution involontaire si le dépôt devient public |
| B. Dépôt privé séparé pour le template, consommé comme sous-module ou paquet privé | Le monorepo peut devenir public sans le template | Mise en place plus complexe ; CI doit accéder au dépôt privé | Faible |
| C. Réécriture : aucun code du template, seulement l'inspiration visuelle | Aucun risque de licence ; identité KAIVIRO propre | Plus de travail en CC-M1 | Faible |

## Proposition

1. **Périmètre CC-M1** : pilotage du projet + partenaires et contacts + matériel de test. Registre des accès en CC-M3. Retours et support reportés à M7. Pas de collecte publicitaire, pas de profilage.
2. **Hébergement** : intégré au Command Center, données dans le schéma `admin`.
3. **Licence** :
   - Les humains lisent la licence et consignent dans un document humain (hors code du template) : usage autorisé, nombre de projets, interdiction de redistribuer la source, obligations de mention.
   - **Tant que le dépôt est privé** : option A acceptable, avec un fichier `LICENSE` du template conservé dans `vendor/<nom>/`.
   - **Avant tout passage en public ou open source** : option B ou C obligatoire, et vérification qu'aucun fichier du template n'existe dans l'historique Git.
   - Recommandation de la mission A : **option C** à terme (identité propre, aucun risque), option A pour accélérer CC-M1 si les humains le décident.
4. Aucun composant du template n'est copié hors de `vendor/<nom>/` (CLAUDE.md §3.11).
5. Le [DESIGN_SYSTEM](../command-center/DESIGN_SYSTEM.md) définit l'identité KAIVIRO ; le template ne l'impose pas.

## Conséquences

- La recette M0 « Licence du template CRM vérifiée et consignée » dépend des humains.
- Si l'option A est retenue, l'ouverture future du dépôt imposera une réécriture de l'historique : coût et risque à anticiper.
- La CI doit pouvoir exclure `vendor/` des contrôles de style, mais pas du scan de secrets.

## Points ouverts

- Nom du template, type de licence (à fournir par les humains).
- Le dépôt KAIVIRO sera-t-il public, et quand ?
- Choix A, B ou C.
- Validation du périmètre CRM (CRM_SPEC §5.0).
