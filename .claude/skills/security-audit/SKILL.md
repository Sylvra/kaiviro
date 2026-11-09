---
name: security-audit
description: Use when auditing KAIVIRO admin, infrastructure or CI changes for secrets, exposure, permissions and agent risks. Read-only review; reports findings, never fixes production.
---

# Audit de sécurité

Squelette (mission A, 2026-11-05).

## Lire d'abord

- `docs/security/SECURITY_BASELINE.md` (S-01 à S-16)
- `docs/security/THREAT_MODEL.md`
- `docs/security/ADMIN_PERMISSIONS.md`

## Points de contrôle

1. Secrets : aucun dans le diff, l'historique, les journaux, les exemples.
2. Exposition : ports, `0.0.0.0`, `privileged`, socket Docker.
3. CI : actions épinglées par SHA, `permissions` minimales, pas de `pull_request_target`.
4. API admin : rôle et niveau sur chaque route, motif et confirmation pour N2/N3.
5. Agents IA : aucun accès en écriture à la production, à la Pi ou à l'API admin.
6. Dépendances : licence, maintenance, validation humaine.

## Sortie

Liste de constats : gravité, fichier, ligne, scénario, mesure proposée.

## Interdit

Lire le dossier des credentials, tester une attaque sur une ressource réelle.
