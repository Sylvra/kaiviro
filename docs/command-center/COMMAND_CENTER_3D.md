---
title: Command Center — vue 3D (cadrage)
owner: mission-a
status: DRAFT
version: 0.1
updated: 2026-11-05
---

# Command Center — vue 3D (cadrage)

Cadrage seulement. Réalisation prévue en **CC-M4**, après la 2D, la supervision réelle et les actions contrôlées. Aucune scène n'est développée en M0.

Documents liés : [ADR-0014](../adr/ADR-0014-stack-front-command-center-3d.md) · [COMMAND_CENTER_NAVIGATION §7](COMMAND_CENTER_NAVIGATION.md) · [COMMAND_CENTER_SPEC](COMMAND_CENTER_SPEC.md).

## 1. Concept : l'agence virtuelle

Une scène isométrique représente l'organisation de KAIVIRO comme une agence :

- sept **salles**, une par département (Executive, Infrastructure, AI Lab, Automotive, Dev Studio, Knowledge, Security) ;
- une **salle serveur** qui représente la Pi et ses conteneurs ;
- des **postes** pour les deux admins et les deux instances Claude Code ;
- des **voyants** dont l'état reflète les endpoints réels.

Chaque élément cliquable ouvre la route 2D correspondante.

## 2. Règles

1. **Données réelles uniquement.** Mêmes endpoints que la 2D. Aucune animation qui simule une activité. Un service inconnu a un voyant « inconnu », pas vert.
2. **Désactivable.** Interrupteur dans les paramètres, désactivé par défaut sur mobile.
3. **Non bloquante.** Aucune fonction n'est accessible uniquement en 3D.
4. **Chargement à la demande.** Code 3D dans un paquet séparé, chargé à l'ouverture de `/agency` seulement.
5. **Repli sans WebGL.** Détection au chargement ; sans WebGL ou si le GPU est trop faible, affichage d'un plan 2D SVG cliquable équivalent.
6. **Accessibilité.** Liste textuelle des salles et de leurs états à côté du canvas. Navigation clavier entre salles. `prefers-reduced-motion` : caméra fixe, pas d'animation.
7. **Identité KAIVIRO.** Modèles créés pour le projet ou sous licence compatible vérifiée.

## 3. Comparatif des moteurs

| Critère | Three.js | React Three Fiber (R3F) | Babylon.js |
|---|---|---|---|
| Licence | MIT | MIT (dépend de Three.js, MIT) | Apache 2.0 |
| Nature | Bibliothèque bas niveau | Rendu React déclaratif au-dessus de Three.js | Moteur complet |
| Intégration Next.js/React | Manuelle (cycle de vie à gérer) | Native (composants, hooks) | Manuelle ou wrapper communautaire |
| Poids | Moyen ; importations ciblées possibles | Three.js + couche R3F ; écosystème optionnel (drei) | Plus lourd ; modules ES disponibles |
| Écosystème | Très large | Large (drei, postprocessing) | Large, outils intégrés (inspecteur, physique) |
| Performances | Excellentes, contrôle fin | Proches de Three.js si bien utilisé | Excellentes, beaucoup d'optimisations intégrées |
| Mobile | Bon si scène sobre | Bon si scène sobre | Bon, outils d'adaptation intégrés |
| Courbe d'apprentissage | Moyenne | Faible pour un dev React | Moyenne à forte |

Les poids exacts en ko ne sont pas donnés ici : ils seront mesurés sur un prototype en CC-M4. Les licences sont à revérifier au moment de l'ajout de la dépendance.

**Proposition** : React Three Fiber, cohérent avec une stack Next.js/React (ADR-0014). Three.js seul en alternative si la couche React pose problème de performance. Babylon.js écarté sauf besoin d'outillage intégré.

## 4. Budget proposé (à mesurer, pas à promettre)

- Scène low-poly, matériaux simples, pas d'ombres temps réel sur mobile.
- Objectif de fluidité et poids de paquet fixés après prototype, puis vérifiés en CI.
- Rendu à la demande (pas de boucle continue si rien ne change).

## 5. Points ouverts

- Style graphique de la scène (isométrique, vue de dessus, autre).
- Création des modèles : interne ou licence.
- Activation par défaut sur desktop ou non.
