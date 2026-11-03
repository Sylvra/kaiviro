# CLAUDE.md — Constitution commune KAIVIRO

> Ce fichier est lu automatiquement par chaque instance Claude Code travaillant sur ce dépôt.
> Il est **maintenu par les humains uniquement**. Une instance Claude peut proposer une modification
> dans son rapport de mission, jamais l'éditer elle-même.

## 1. Le projet

KAIVIRO est une plateforme automobile intelligente :
- application mobile **Android d'abord** (iOS plus tard), **offline-first** ;
- lecture **OBD-II/EOBD en lecture seule** via adaptateur Bluetooth ;
- **moteur de diagnostic déterministe** séparé de l'IA ;
- IA **hybride** : modèle local si l'appareil le permet, modèles cloud via une passerelle ;
- base de connaissances automobile **sourcée, versionnée, validée** ;
- **Command Center** privé pour les administrateurs ;
- **Raspberry Pi 5** réservée à l'administration et à la supervision — jamais à la production.

Ancien nom de travail : VEYDRIA. Tout document mentionnant VEYDRIA se lit KAIVIRO.
Le nom KAIVIRO n'est pas validé juridiquement (ADR-0013 ouverte).

**Répartition** (détail dans `docs/roadmap/M0_PLAN.md` §4) :
- **Mission A — Administration & Opérations** (Johan) : Command Center, CRM d'administration, vue 3D, API d'administration, supervision, Raspberry Pi, conteneurs, réseau, accès, sauvegardes, organisation GitHub.
- **Mission B — Stack applicative** : produit, Android, OBD, moteur déterministe, backend, persistance, synchronisation, IA, connaissances.

**Chemin critique de l'application** (ne pas l'inverser) :
modèle véhicule → données OBD fiables → interprétation déterministe → connaissances sourcées → explication IA → synchronisation et supervision.
Côté administration : Command Center 2D d'abord, puis supervision réelle, puis actions contrôlées, puis vue 3D **branchée sur des données réelles** (CC-M4). Jamais de données fictives présentées comme réelles.

## 2. Documents de référence (à lire avant toute intervention)

1. `README.md`
2. `CLAUDE.md` (ce fichier)
3. `docs/roadmap/M0_PLAN.md` — plan, ADR, matrice de propriété des fichiers
4. Les ADR de `docs/adr/` liées à la tâche
5. Les contrats de `packages/api-contracts/` et `packages/schemas/` liés à la tâche

Références externes (lecture seule, ne pas recopier en masse dans le dépôt) :
- Cahier des charges v0.1 et Dossier d'architecture Command Center v0.1 (Google Drive du projet, fournis par les humains si nécessaire).
- Vault Obsidian du projet sur Google Drive (voir §5).

## 3. Règles absolues

1. Une hypothèse n'est jamais une décision. Toute décision structurante passe par une **ADR au statut PROPOSED**, validée par les deux humains.
2. **Aucun secret, credential, clé API, `.env`, donnée personnelle ou sauvegarde utilisateur** dans Git, les prompts, les logs ou les commits. Ne jamais lire, ouvrir ou référencer le dossier Drive des credentials.
3. **Ne jamais inventer** de fait automobile : PID, plage, seuil, DTC, compatibilité véhicule/adaptateur, résultat de diagnostic, métrique. Une valeur non documentée reste « inconnue ».
4. Aucune commande de contrôle du véhicule, aucune écriture ECU, aucun effacement de DTC.
5. Aucun service payant, aucune ressource cloud, aucun compte créé. Aucun déploiement.
6. **Raspberry Pi : interdiction d'y accéder ou de la modifier.** Les instances Claude rédigent documentation, fichiers Compose et scripts *proposés* (sans secret) ; seul Johan les relit et les applique.
11. **Templates et code tiers** : ne jamais télécharger un template commercial. Si les humains en ont placé un, avec sa licence, dans `apps/command-center/vendor/<nom>/`, ses composants ne sont utilisés que dans ce dossier, jamais recopiés ailleurs ni publiés (ADR-0015). L'identité visuelle reste celle de KAIVIRO.
7. Aucune dépendance installée sans vérification de **licence**, de maintenance et validation humaine.
8. Toute proposition technique présente : avantages, limites, coûts, alternatives, risques.
9. Toute modification est accompagnée de sa documentation et des contrôles adaptés (lint, tests, vérification de liens).
10. Ne jamais contourner les protections GitHub ou une validation humaine.

## 4. Mode opératoire Git

- Travailler **uniquement sur sa branche** et dans son worktree.
- Jamais de push sur `main` ni sur `develop`. Pull Request vers `develop`, fusion par un humain.
- **Ne jamais éditer un fichier possédé par l'autre mission** (voir matrice dans `docs/roadmap/M0_PLAN.md`). Pour proposer un changement sur un fichier de l'autre : l'écrire dans la section « Propositions croisées » de son propre rapport.
- Conventional Commits : `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, avec portée : `docs(adr): ...`.
- Petits commits cohérents, un sujet par commit.

## 5. Documentation

Deux espaces, deux rôles, **aucun fichier dans les deux** :

| Espace | Contenu | Qui écrit |
|---|---|---|
| **Dépôt Git** — `docs/`, `knowledge/`, `packages/` | Ce qui engage le projet : ADR, architecture, contrats, schémas, sécurité, rapports de mission, fiches de connaissance automobile consommées par l'application | Instances Claude (sur leur branche) + humains, via PR |
| **Vault Obsidian sur Google Drive** | Mémoire du projet : notes de travail, recherches, comptes rendus, brouillons, journal, idées, médias et PDF de référence | Humains uniquement |

Règles :
- Le vault Drive est **en lecture seule** pour les instances Claude, et seulement si un humain fournit le chemin d'une note précise. Ne jamais parcourir le Drive entier.
- Le dossier des credentials est hors du vault ; il n'est jamais lu.
- Une décision prise dans le vault n'existe pour le projet qu'une fois **transcrite en ADR** dans Git. Une note du vault n'est jamais une source de vérité technique.
- Pour citer une note du vault dans un document Git : son titre et son chemin Drive, sans recopier son contenu.
- Aucun dépôt Git ni worktree dans un dossier synchronisé par Google Drive.

Chaque document versionné commence par un en-tête :

```
---
title: <titre>
owner: mission-a | mission-b | humans
status: DRAFT | PROPOSED | VALIDATED | DEPRECATED
version: 0.1
updated: AAAA-MM-JJ
---
```

- Dans le dépôt : liens internes en chemins relatifs Markdown standard (`[texte](../adr/ADR-0002.md)`), lisibles dans GitHub. Pas de syntaxe `[[wikilink]]` dans les documents versionnés.
- Diagrammes en Mermaid dans le Markdown.

## 6. Format des ADR

Fichier `docs/adr/ADR-XXXX-titre-court.md` :

```
# ADR-XXXX — Titre
Statut : PROPOSED | ACCEPTED | REJECTED | SUPERSEDED by ADR-YYYY
Date : AAAA-MM-JJ
Propriétaire : mission-a | mission-b
Relecteur : mission-b | mission-a + humains

## Contexte
## Options étudiées (avantages / limites / coûts / licences)
## Proposition
## Conséquences
## Points ouverts
```

## 7. Fin de tâche

Chaque tâche ou mission se termine par un résumé contenant : fichiers créés/modifiés, contrôles exécutés et résultats, décisions proposées, risques, dépendances avec l'autre mission, propositions croisées, tâches restantes.
