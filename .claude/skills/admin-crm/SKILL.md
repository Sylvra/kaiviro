---
name: admin-crm
description: Use when working on the KAIVIRO admin CRM (deliverables, planning, team, partners, decisions, test equipment). Enforces data minimisation, consent and retention rules.
---

# CRM d'administration

Squelette (mission A, 2026-11-05).

## Lire d'abord

- `docs/command-center/CRM_SPEC.md` (§5.0 périmètre, §5.8 conservation)
- `docs/adr/ADR-0015-crm-et-template-tiers.md`
- `docs/security/ADMIN_PERMISSIONS.md`

## Règles

1. Données professionnelles minimales. Aucun profilage, aucune collecte publicitaire.
2. Partenaires visibles par Administrator et Owner seulement.
3. Suppression = N3 (Owner, confirmation renforcée, audit).
4. Pas d'immatriculation ni de VIN par défaut dans le registre du matériel.
5. Aucune compatibilité adaptateur/véhicule déduite du registre.
6. Toute nouvelle donnée personnelle : durée de conservation définie avant collecte.

## À compléter

- Modèle de données final après validation du périmètre par les humains.
