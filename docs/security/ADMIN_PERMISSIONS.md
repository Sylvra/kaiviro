---
title: Permissions administrateurs
owner: mission-a
status: DRAFT
version: 0.1
updated: 2026-11-05
---

# Permissions administrateurs

Référence pour les comptes du Command Center et de l'API d'administration. L'authentification des utilisateurs de l'app relève de B.

Documents liés : [ADR-0012](../adr/ADR-0012-command-center-acces.md) · [API admin](../../packages/api-contracts/admin/openapi.yaml) · [audit-event](../../packages/schemas/ops/audit-event.schema.json) · [CRM_SPEC §7](../command-center/CRM_SPEC.md).

## 1. Rôles

| Rôle | Pour qui | Principe |
|---|---|---|
| Owner | Les deux humains fondateurs | Tout, N3 avec confirmation renforcée |
| Administrator | Un admin d'exploitation futur | Opérations et CRM, pas les rôles ni l'audit |
| Developer | Un développeur futur | Développement, journaux, relances de CI autorisées |
| Viewer | Observateur | Lecture, hors données personnelles du CRM |

Au démarrage : Johan et le collègue sont **Owner**. Aucun autre compte. Les instances Claude n'ont **aucun** compte.

## 2. Niveaux d'action

| Niveau | Nature | Contrôles |
|---|---|---|
| N1 · Consultation | Lire | Session valide + rôle |
| N2 · Opération contrôlée | Action réversible à effet limité | + liste blanche + motif + confirmation + audit + idempotence |
| N3 · Administration sensible | Irréversible ou touche aux droits | + MFA re-saisie (moins de 5 min) + saisie du nom de la ressource + audit |

## 3. Matrice actions × rôles

| Action | Niveau | Owner | Administrator | Developer | Viewer |
|---|---|---|---|---|---|
| Voir synthèse, infra, IA, automotive, knowledge | N1 | ✅ | ✅ | ✅ | ✅ |
| Voir livrables, décisions, planning, équipe | N1 | ✅ | ✅ | ✅ | ✅ |
| Voir partenaires et matériel (données personnelles) | N1 | ✅ | ✅ | ❌ | ❌ |
| Voir incidents | N1 | ✅ | ✅ | ✅ | ✅ |
| Voir journaux détaillés (Loki) | N1 | ✅ | ✅ | ✅ | ❌ |
| Voir journal d'audit | N1 | ✅ | ❌ | ❌ | ❌ |
| Déplacer un livrable, commenter une décision | N2 | ✅ | ✅ | ✅ | ❌ |
| Relancer un workflow CI de la liste blanche | N2 | ✅ | ✅ | ✅ | ❌ |
| Relancer un contrôle de santé | N2 | ✅ | ✅ | ✅ | ❌ |
| Créer, éditer un partenaire ou du matériel | N2 | ✅ | ✅ | ❌ | ❌ |
| Redémarrer un conteneur de la liste blanche | N2 | ✅ | ✅ | ❌ | ❌ |
| Déclarer, traiter, clore un incident | N2 | ✅ | ✅ | ❌ | ❌ |
| Supprimer un partenaire | N3 | ✅ | ❌ | ❌ | ❌ |
| Créer, modifier, révoquer un compte ou un rôle | N3 | ✅ | ❌ | ❌ | ❌ |
| Exporter les données d'une personne (RGPD) | N3 | ✅ | ❌ | ❌ | ❌ |
| Commande libre, shell, SQL direct | — | ❌ | ❌ | ❌ | ❌ |
| Déploiement de production depuis le Command Center | — | ❌ en CC-M1 à CC-M3 | ❌ | ❌ | ❌ |

## 4. Contrôles côté serveur

Ordre de vérification pour chaque requête N2/N3 :

1. Session valide, MFA faite, compte actif.
2. Rôle suffisant (`x-kaiviro-min-role` de l'OpenAPI).
3. Ressource dans le périmètre et dans la liste blanche.
4. Conditions de sécurité (ex. pas d'incident SEV1 bloquant l'action, à définir).
5. Confirmation (`X-Kaiviro-Confirm`) valide, à usage unique.
6. Motif (`X-Kaiviro-Reason`) présent.
7. Journalisation `requested`, exécution, journalisation `succeeded` ou `failed`.

Refus à n'importe quelle étape : 403, journalisé `denied`, sans détail exploitable dans la réponse.

## 5. Confirmation renforcée (N3)

- Re-saisie MFA de moins de 5 minutes.
- Saisie exacte du nom de la ressource.
- Récapitulatif des conséquences.
- Option proposée : double validation par le second Owner pour les révocations de compte. À trancher.

## 6. Journal d'audit

- Champs : voir [`audit-event.schema.json`](../../packages/schemas/ops/audit-event.schema.json).
- Ajout seul. Aucune modification ni suppression par l'application.
- Rétention proposée : 2 ans, puis archivage chiffré ou suppression. À valider.
- Jamais de secret, de mot de passe, de jeton, de contenu de conversation.
- Lecture réservée à Owner.
