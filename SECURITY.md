---
title: Politique de sécurité
owner: mission-a
status: DRAFT
version: 0.1
updated: 2026-11-05
---

# Politique de sécurité

## Signaler une vulnérabilité

Ne pas ouvrir d'issue publique. Utiliser **GitHub · Security · Report a vulnerability** (signalement privé) si l'option est activée sur le dépôt, sinon contacter directement un mainteneur via GitHub.

Indiquer : composant, version ou commit, étapes de reproduction, impact estimé. Ne jamais joindre de secret réel ni de donnée personnelle.

Délais visés (non contractuels en phase M0) : accusé de réception sous 7 jours, première analyse sous 14 jours.

## Périmètre

- Application Android, backend, Command Center, API d'administration, infrastructure de supervision, CI.
- Hors périmètre : services tiers (GitHub, hébergeurs), sauf mauvaise configuration de notre part.

## Principes du projet

- OBD-II en **lecture seule** : aucune commande véhicule, aucune écriture ECU, aucun effacement de DTC.
- Aucun secret dans Git. Secret exposé = incident SEV1, révocation immédiate ([INCIDENT_MANAGEMENT](docs/operations/INCIDENT_MANAGEMENT.md)).
- Administration accessible par VPN uniquement ([ADR-0012](docs/adr/ADR-0012-command-center-acces.md)).

Références : [SECURITY_BASELINE](docs/security/SECURITY_BASELINE.md) · [THREAT_MODEL](docs/security/THREAT_MODEL.md).
