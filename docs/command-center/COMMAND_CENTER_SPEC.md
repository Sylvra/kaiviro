---
title: Command Center — spécification fonctionnelle (2D)
owner: mission-a
status: DRAFT
version: 0.1
updated: 2026-11-05
---

# Command Center — spécification fonctionnelle (2D)

Le Command Center est l'interface privée des deux administrateurs. Il regroupe un espace **CRM** ([CRM_SPEC](CRM_SPEC.md)) et un espace **Opérations** de sept départements, décrit ici. Version 2D complète, utilisable sans la vue 3D ([COMMAND_CENTER_3D](COMMAND_CENTER_3D.md)).

Documents liés : [COMMAND_CENTER_NAVIGATION](COMMAND_CENTER_NAVIGATION.md) · [DESIGN_SYSTEM](DESIGN_SYSTEM.md) · [ADMIN_ARCHITECTURE](../architecture/ADMIN_ARCHITECTURE.md) · [OBSERVABILITY_CONTRACT](../architecture/OBSERVABILITY_CONTRACT.md) · [ADMIN_PERMISSIONS](../security/ADMIN_PERMISSIONS.md) · [API admin](../../packages/api-contracts/admin/openapi.yaml).

## 1. Règles transverses

- **Sources** : codes S1 à S9 définis dans [CRM_SPEC §4](CRM_SPEC.md). Chaque carte affiche sa source et son âge.
- **Niveaux d'action** : N1 consultation, N2 opération contrôlée, N3 administration sensible ([ADMIN_PERMISSIONS](../security/ADMIN_PERMISSIONS.md)).
- **États standard** de chaque bloc :

| État | Rendu | Déclencheur |
|---|---|---|
| Chargement | Squelette aux dimensions finales, pas de spinner plein écran | requête en cours |
| Donnée réelle | Valeur + source + « il y a x min » | `freshness: live` |
| Donnée ancienne | Valeur grisée + badge ambre « Ancienne » + âge | `freshness: stale` |
| Inconnu | `—` + badge « Inconnu » + raison | `freshness: unknown` |
| Démonstration | Valeur + badge « Données de démonstration » | `demo: true` |
| Erreur | Bandeau ambre « Source injoignable », dernière synchro, bouton « Réessayer » | erreur de l'API admin |
| Vide | Phrase courte + action utile | liste vide |
| Interdit | Bloc masqué ; si lien direct : page « Accès non autorisé » | 403 |

- **Mobile** (< 768 px) : une colonne, cartes empilées par priorité, tableaux transformés en listes, actions N3 indisponibles sur mobile (proposé, à valider).
- **Aucun seuil inventé** : une jauge sans seuil validé n'affiche pas de couleur d'alerte, seulement la valeur.

## 2. Départements

### 01 · Executive Overview

- **Objectif** : savoir en 10 secondes si tout va bien, et sinon quoi regarder.
- **Écrans** : Synthèse.
- **Informations** :

| Bloc | Source | Fréquence | Phase |
|---|---|---|---|
| Santé : API, base, Command Center, Pi, stockage, VPN | S4, S5, S7 | 1 min | CC-M2 |
| Dernière sauvegarde et dernier test de restauration | S6 | à chaque exécution | CC-M2 |
| Dernier déploiement par composant | S1, S7 `/version` | 5 min | CC-M2 |
| Incidents ouverts par gravité | S8 | temps réel | CC-M3 |
| Tableau des sources (x / 9 connectées) | `/admin/v1/sources` | 5 min | CC-M1 |

- **Actions** : N1 tout consulter ; N2 relancer un contrôle de santé.
- **Permissions** : Viewer et plus.
- **Mobile** : bandeau d'état global, puis liste des services en anomalie, puis le reste.

### 02 · Infrastructure

- **Objectif** : état de la Pi, des conteneurs, du réseau et du cloud.
- **Écrans** : Raspberry Pi · Conteneurs · Réseau · Cloud.
- **Informations** :

| Bloc | Source | Fréquence | Phase |
|---|---|---|---|
| Pi : CPU, RAM, température, disque, uptime, throttling | S5 Node Exporter | 30 s | CC-M2 |
| Conteneurs : état, image, redémarrages, CPU, mémoire | S5 cAdvisor + inventaire Compose | 30 s | CC-M2 |
| Réseau : ports exposés (cible 0), état du tunnel VPN, certificats TLS, SSH | S4 + inventaire | 5 min | CC-M2 |
| Cloud : hébergeurs (ADR-0004, ADR-0014) | S7 + statut fournisseurs | 5 min | M4 |

- **Actions** : N1 consulter ; N2 redémarrer un conteneur de la liste blanche (Administrator) ; aucune commande libre.
- **Permissions** : Viewer en lecture ; Administrator pour N2.
- **Inconnu** : Pi non installée → « Pi non installée · aucune métrique ».
- **Mobile** : Pi en premier, conteneurs en liste compacte, graphiques réduits à la dernière valeur + mini tendance.

### 03 · AI Laboratory

- **Objectif** : suivre la passerelle IA et la qualité, sans jamais voir le contenu des conversations.
- **Écrans** : Modèles · Agents · RAG · Évaluation.
- **Informations** :

| Bloc | Source | Phase |
|---|---|---|
| Modèles actifs, latence, erreurs, quotas, coût estimé | S9 | M5 |
| Agents prévus et disponibilité | doc ORCHESTRATION_AND_AGENTS (B), statique | CC-M1 |
| RAG : documents indexés, version, sources en attente | Knowledge Engine (B) | M3 |
| Évaluation : dimensions et taux de réussite | jeux de test (B) | M5 |

- **Actions** : N1 seulement en M0–CC-M3.
- **Permissions** : Viewer.
- **Interdit** : affichage de prompts, de réponses ou d'identifiants de conversation.
- **Mobile** : liste des modèles avec latence et erreurs.

### 04 · Automotive

- **Objectif** : suivre les versions du catalogue, des règles et la matrice de compatibilité.
- **Écrans** : Versions · Compatibilité.
- **Informations** : versions du catalogue et des règles (S2 + `packages/diagnostic-rules`, M1) ; matrice adaptateur × firmware × Bluetooth × Android × véhicule × fonctions vérifiées × date (`packages/schemas/app` + essais réels, M2).
- **Règle** : une compatibilité non testée s'affiche « non vérifiée ». Aucune compatibilité déduite.
- **Actions** : N1.
- **Permissions** : Viewer.
- **Mobile** : filtres en haut, matrice en cartes.

### 05 · Development Studio

- **Objectif** : branches, PR, CI, releases, tickets.
- **Écrans** : Pull requests · CI · Releases · Tickets.
- **Informations** : S1 (5 min + webhook).
- **Actions** : N1 consulter ; N2 relancer un workflow autorisé (liste blanche, jamais un déploiement de production en CC-M1).
- **Permissions** : Viewer ; Developer pour N2.
- **Mobile** : PR ouvertes et état CI en liste.

### 06 · Knowledge Center

- **Objectif** : retrouver la documentation et les décisions.
- **Écrans** : Registre ADR · Documentation du dépôt · Vault.
- **Informations** : S2 (en-têtes des ADR), S1 (arborescence `docs/`), S3 (liste des notes du vault, titres et liens seulement).
- **Actions** : N1, « Ouvrir dans GitHub », « Ouvrir dans Drive ».
- **Permissions** : Viewer.
- **Règle** : le contenu des notes du vault n'est pas recopié ni indexé par le Command Center.
- **Mobile** : recherche en tête, liste plate.

### 07 · Security & Incidents

- **Objectif** : incidents, permissions, audit, hygiène de sécurité.
- **Écrans** : Incidents · Permissions · Audit · Hygiène.
- **Informations** :

| Bloc | Source | Phase |
|---|---|---|
| Incidents (id, détection, service, gravité, état, responsable, actions, résolution) | S8 | CC-M3 |
| Matrice des permissions | ADMIN_PERMISSIONS + S8 | CC-M3 |
| Journal d'audit | S8 | CC-M3 |
| Certificats, sauvegardes, alertes de configuration, scan de secrets CI | S4, S6, S1 | CC-M2 |

- **Actions** : N2 déclarer, traiter, clore un incident (Administrator) ; N3 modifier un rôle (Owner, confirmation renforcée).
- **Permissions** : Viewer en lecture des incidents ; audit réservé à Owner.
- **Mobile** : incidents ouverts en premier ; matrice et audit en lecture seule.

## 3. Interdits par défaut

Terminal dans le navigateur, commande libre, accès direct à PostgreSQL depuis le front, port d'administration public, modification de production par un agent IA, suppression irréversible sans validation N3.

## 4. Points ouverts

- Actions N3 désactivées sur mobile : à valider.
- Liste blanche initiale des workflows relançables.
- Contenu exact de l'écran « Hygiène » (dépend du scan de secrets retenu en CI).
