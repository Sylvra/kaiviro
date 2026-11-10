---
title: ADR-0016 — Le Command Center devient KAIVIRO NEXUS, plateforme d'opérations
owner: mission-a
status: PROPOSED
version: 0.1
updated: 2026-11-10
---

# ADR-0016 — Le Command Center devient KAIVIRO NEXUS, plateforme d'opérations

Statut : PROPOSED
Date : 2026-11-10
Propriétaire : mission-a
Relecteur : humains

## Contexte

Le prototype CC-M1 (PR #1) a livré un CRM et des tableaux de supervision côte à côte : kanban, planning, partenaires, départements Opérations et agence 3D. Chaque page recalculait ses propres données.

Le 10/11/2026, Johan l'a jugé « un assemblage de dashboards ». Il demande un vrai logiciel de gestion, à la manière d'un CRM moderne, qui intègre un centre de supervision d'infrastructure. La PR #1 a été fermée et le développement repart de zéro sur `feature/command-center-v2`.

## Options étudiées

| Option | Avantages | Limites | Risques |
|---|---|---|---|
| A. Reprendre CC-M1 et l'améliorer | Code existant et testé (91 tests), données réelles déjà branchées | Structure par pages indépendantes : chaque nouvel écran ajoute un tableau de bord de plus | L'incohérence grandit à chaque ajout |
| B. **Plateforme d'objets reliés : NEXUS** (proposée) | Un modèle unique (objets, relations, chronologie, vues) ; un nouvel objet ne demande pas de nouvelle page ; les mêmes données servent en 2D et en 3D | Plus de conception avant le premier écran ; composants génériques plus exigeants | Sur-ingénierie si le registre d'objets devient trop tôt un « CRM configurable » complet (reporté à NX-4) |
| C. Adopter un CRM open source auto-hébergé et y brancher la supervision | Fonctions CRM disponibles tout de suite | Supervision et permissions N1–N3 à greffer ; service à héberger ; licence copyleft ; identité visuelle imposée | Forte dépendance ; conflit avec ADR-0015 et avec la règle 5 de CLAUDE.md |

## Proposition

1. Le Command Center est renommé **KAIVIRO NEXUS**. Il est repositionné en **Project Operations & Infrastructure Management Platform**, avec quatre piliers : Business Operations, Infrastructure Operations, Observability et Command Center.
2. Il est construit sur un **modèle d'objets reliés** : chaque objet a une fiche, des relations, une chronologie unifiée et des vues configurables ([NEXUS_SPEC_V2](../command-center/NEXUS_SPEC_V2.md)).
3. La sécurité ne change pas : une seule API d'administration, permissions N1–N3 vérifiées côté serveur, actions sur liste blanche exécutées par l'agent de la Pi, audit en ajout seul.
4. Les produits existants servent d'inspiration seulement : aucun code tiers n'est recopié (ADR-0015, option C).
5. Aucun développement ne commence avant la validation de NX-0 : cette ADR, NEXUS_SPEC_V2 et un DESIGN_SYSTEM V2.

## Conséquences

- COMMAND_CENTER_SPEC, COMMAND_CENTER_NAVIGATION, CRM_SPEC (§3 et §5), COMMAND_CENTER_3D et DESIGN_SYSTEM sont à réécrire après acceptation.
- ADMIN_PERMISSIONS reçoit les nouvelles lignes de NEXUS_SPEC_V2 §11.
- L'OpenAPI admin passe à une API d'objets générique (v0.3).
- La liste unique des ADR du M0_PLAN (fichier humain) doit inclure ADR-0016.
- Le code de CC-M1 reste consultable sur `feature/cc-m1-command-center`, comme référence de comportement pour les connecteurs, la provenance et la 3D.

## Points ouverts

Voir NEXUS_SPEC_V2 §14 : le nom, le budget, la référence « Bastion », le statut de Valheim sur la Pi et les objets personnalisables.
