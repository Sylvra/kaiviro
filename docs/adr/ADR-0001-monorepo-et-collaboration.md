---
title: ADR-0001 — Monorepo et collaboration
owner: mission-a
status: PROPOSED
version: 0.1
updated: 2026-11-05
---

# ADR-0001 — Monorepo et collaboration

Statut : PROPOSED
Date : 2026-11-05
Propriétaire : mission-a
Relecteur : mission-b + humains

## Contexte

Deux humains, deux instances Claude Code en parallèle, un seul produit (app, backend, Command Center, infrastructure). Le dépôt `Sylvra/kaiviro` est **privé sur un compte personnel GitHub Free**. Constat du 05/11/2026 : l'API de protection des branches répond **HTTP 403** pour ce dépôt. La proposition initiale (« `main`/`develop` protégées, PR + 1 approbation ») n'est donc pas applicable telle quelle.

Mesures déjà en place : PR obligatoire par règle écrite (CLAUDE.md §4), hook local `.git/hooks/pre-push` bloquant `main` et `develop` dans le clone principal, worktrees séparés `kaiviro-claude-a` et `kaiviro-claude-b`.

## Options étudiées

### Organisation du code

| Option | Avantages | Limites | Coûts |
|---|---|---|---|
| **Monorepo** (proposé) | Contrats et code au même endroit, une PR peut couvrir contrat + usage, revue croisée simple | CI à découper par chemin ; droits non séparables par dossier | 0 € |
| Plusieurs dépôts (app, admin, infra) | Isolation, droits séparés | Contrats dupliqués, synchronisation manuelle | 0 € |

### Protection des branches

| Option | Avantages | Limites | Coûts | Risques |
|---|---|---|---|---|
| A. Règle écrite + hook local `pre-push` (actuel) | Immédiat, gratuit | Local, contournable, à installer dans chaque clone | 0 € | Push direct par erreur depuis un clone sans hook |
| B. Dépôt public | Protection et rulesets disponibles gratuitement | Tout le code et l'historique deviennent publics ; incompatible avec le template sous licence (ADR-0015) ; nom non validé (ADR-0013) | 0 € | Fuite de contenu non prévu pour le public |
| C. Organisation GitHub Team | Protection et rulesets sur dépôt privé | Service payant (interdit sans décision humaine) | payant | — |
| D. GitHub Pro sur le compte personnel | Protection sur dépôt privé (selon l'offre GitHub en vigueur, à vérifier) | Service payant | payant | — |
| E. Contrôle en CI après coup | Détecte un push direct (commit sans PR associée) et alerte | Ne bloque pas, détecte seulement | 0 € | Délai de détection |

## Proposition

1. **Monorepo**, structure du [M0_PLAN §2](../roadmap/M0_PLAN.md).
2. Branches : `main` (releases) ← `develop` (intégration) ← `feature/*`. Fusion par un humain uniquement.
3. **Protection en M0 : option A + E.** Règle écrite, hook `pre-push` dans **chaque** clone humain, et un contrôle CI ultérieur qui signale tout commit arrivé sur `develop` sans PR. Pas de dépense.
4. Réévaluer B, C ou D avant toute ouverture du dépôt ou arrivée d'un troisième contributeur. Décision humaine.
5. Revue : chaque PR relue par l'humain responsable de l'autre mission quand elle touche un contrat partagé.
6. Conventional Commits, petits commits cohérents.
7. CODEOWNERS indicatif (il ne bloque rien sans protection, mais demande la revue automatiquement).
8. Aucun contournement (`--no-verify`, force push) sans accord écrit des deux humains.

## Conséquences

- La sécurité de `develop` repose sur la discipline et le hook local : risque résiduel moyen (THREAT_MODEL T-14).
- Les instances Claude ne poussent que leur branche `feature/*` et ouvrent des PR.
- Le hook doit être réinstallé après chaque nouveau clone (non versionnable dans `.git/hooks`). Proposition : script d'installation dans `scripts/` (propriété humaine à confirmer).

## Points ouverts

- Qui installe et vérifie le hook dans le clone du collègue ?
- Version du hook à versionner (ex. `scripts/git-hooks/pre-push`) avec `core.hooksPath` ?
- Seuil de déclenchement d'un passage à une offre payante ou à un dépôt public.
