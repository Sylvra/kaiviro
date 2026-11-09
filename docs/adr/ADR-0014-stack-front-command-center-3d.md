---
title: ADR-0014 — Stack front du Command Center et 3D
owner: mission-a
status: PROPOSED
version: 0.1
updated: 2026-11-05
---

# ADR-0014 — Stack front du Command Center et 3D

Statut : PROPOSED
Date : 2026-11-05
Propriétaire : mission-a
Relecteur : mission-b + humains

## Contexte

Le Command Center est une application web privée pour deux admins : 2D d'abord (CC-M1), vue 3D plus tard (CC-M4) branchée sur des données réelles. Une inspiration visuelle provient d'un template commercial (Next.js + Tailwind + Framer Motion), encadré par ADR-0015. Aucune dépendance n'est installée en M0.

## Options étudiées

### Framework

| Option | Avantages | Limites | Licence |
|---|---|---|---|
| **Next.js + TypeScript** (proposé) | Cohérent avec le template, écosystème large, rendu serveur possible | Couplage à l'écosystème Vercel pour certaines fonctions | MIT |
| Vite + React + TypeScript (SPA) | Plus simple, aucun serveur Node nécessaire, servable en statique depuis la Pi | Pas de rendu serveur ; routes serveur à faire ailleurs | MIT |
| SvelteKit | Léger, performant | Incompatible avec les composants du template | MIT |

### Style et animation

Tailwind CSS (MIT), Framer Motion / Motion (MIT), icônes Lucide (ISC). À revérifier à l'ajout.

### 3D

Comparatif détaillé : [COMMAND_CENTER_3D §3](../command-center/COMMAND_CENTER_3D.md). Three.js (MIT), React Three Fiber (MIT), Babylon.js (Apache 2.0).

### Hébergement

| Option | Avantages | Limites | Coûts |
|---|---|---|---|
| Vercel derrière accès privé | Déploiement simple | Compte cloud ; rendre l'accès réellement privé n'est pas trivial ; protection d'accès avancée potentiellement payante | gratuit limité |
| **Servi depuis la Pi via VPN** (proposé pour CC-M1/CC-M2) | Rien d'exposé, aucun compte | La Pi sert l'interface d'admin (pas la production de l'app : compatible avec son rôle) ; dépend de la Pi | 0 € |
| Même hébergeur que le backend (ADR-0004) | Proximité avec l'API admin | Dépend du choix de B | selon B |

## Proposition

1. **Next.js + TypeScript**, Tailwind CSS, Motion, Lucide. Option SPA (export statique) gardée si le Command Center est servi depuis la Pi.
2. **2D d'abord.** Aucune dépendance 3D avant CC-M4.
3. **3D : React Three Fiber**, paquet séparé chargé à la demande, désactivable, repli SVG sans WebGL.
4. **Hébergement CC-M1/CC-M2 : depuis la Pi, via VPN**, en export statique ; l'API admin reste dans le backend (ADMIN_ARCHITECTURE). Réévaluer en CC-M3.
5. Aucune dépendance ajoutée sans vérification de licence, de maintenance et validation humaine.

## Conséquences

- L'API admin doit accepter les requêtes du Command Center servi depuis le VPN (CORS strict, origine interne).
- Le design system ([DESIGN_SYSTEM](../command-center/DESIGN_SYSTEM.md)) est implémenté en jetons Tailwind.
- La branche distante `feature/cc-m1-command-center` (prototype CC-M1) n'est pas couverte par cet ADR : à confronter à cette proposition lors de sa revue.

## Points ouverts

- Rendu serveur nécessaire ou export statique suffisant ?
- Bibliothèque de graphiques (licence).
- Choix final d'hébergement à CC-M3.
