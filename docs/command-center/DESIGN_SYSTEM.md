---
title: Command Center — design system
owner: mission-a
status: DRAFT
version: 0.1
updated: 2026-11-05
---

# Command Center — design system

Identité KAIVIRO propre. Une inspiration n'est pas une copie : aucun composant, aucune illustration, aucun texte du template ne sert de référence de code ([ADR-0015](../adr/ADR-0015-crm-et-template-tiers.md)).

Documents liés : [CRM_SPEC §2](CRM_SPEC.md) · [COMMAND_CENTER_SPEC](COMMAND_CENTER_SPEC.md) · [ADR-0014](../adr/ADR-0014-stack-front-command-center-3d.md).

## 1. Deux thèmes

Le prompt de mission demande une identité « sombre et technique ». La maquette validée avec Johan le 03/11/2026 ([CRM_SPEC §2](CRM_SPEC.md)) est **claire**. Le document du dépôt prime : le thème **Ivoire** (clair) est le thème par défaut. Un thème **Nuit** (sombre) est proposé en option. Décision à confirmer par les humains (rapport §4).

Les deux thèmes partagent les mêmes jetons sémantiques. Seules les valeurs changent.

## 2. Couleurs

### 2.1 Thème Ivoire (défaut, validé)

| Jeton | Valeur | Usage |
|---|---|---|
| `bg.canvas` | `#F4F1EC` | Fond de page |
| `bg.surface` | `#FFFFFF` | Cartes |
| `border.subtle` | `#ECE7DF` | Bordures |
| `sidebar.gradient` | `#E6F4EE` → `#EEF0F7` → `#F1ECF8` | Barre latérale |
| `text.primary` | `#1D1B19` | Texte principal |
| `text.secondary` | `#3B3833` | Texte secondaire |
| `text.muted` | `#5F5A53` | Texte discret |
| `accent` / `accent.hover` | `#0F766E` / `#115E59` | Actions, focus |
| `on.accent` | `#FFFFFF` | Texte sur accent |

### 2.2 Thème Nuit (proposé)

| Jeton | Valeur |
|---|---|
| `bg.canvas` | `#121416` |
| `bg.surface` | `#1A1D21` |
| `border.subtle` | `#2A2E34` |
| `text.primary` | `#EDEAE4` |
| `text.secondary` | `#B9B4AC` |
| `text.muted` | `#9A958D` |
| `accent` | `#5EEAD4` |
| `on.accent` | `#0B1F1D` |

### 2.3 Couleurs d'état (fond / texte)

| Rôle | Ivoire | Nuit |
|---|---|---|
| Mission A | `#DDF4EC` / `#0F5F57` | `#16302A` / `#86EFAC` |
| Mission B | `#ECE8FB` / `#4B3BB0` | `#241F3D` / `#C4B5FD` |
| Commun | `#FDE9DF` / `#A8432A` | `#3A2416` / `#FDBA74` |
| Alerte / inconnu | `#FFF1CC` / `#6B4A08` | `#3A2F10` / `#FCD34D` |
| Information | `#E0F0FB` / `#1E5A85` | `#13283D` / `#93C5FD` |
| Critique | `#FDE4E1` / `#9F2F24` | `#3D1716` / `#FCA5A5` |

### 2.4 Contrastes vérifiés

Calcul WCAG 2.x (luminance relative), script local du 05/11/2026. Seuil AA texte normal : 4,5:1.

| Paire | Ratio | | Paire (Nuit) | Ratio |
|---|---|---|---|---|
| `#1D1B19` sur `#FFFFFF` | 17,17 | | `#EDEAE4` sur `#1A1D21` | 14,09 |
| `#3B3833` sur `#FFFFFF` | 11,67 | | `#B9B4AC` sur `#1A1D21` | 8,20 |
| `#5F5A53` sur `#FFFFFF` | 6,83 | | `#9A958D` sur `#1A1D21` | 5,68 |
| `#5F5A53` sur `#F4F1EC` | 6,06 | | `#5EEAD4` sur `#1A1D21` | 11,43 |
| `#FFFFFF` sur `#0F766E` | 5,47 | | `#0B1F1D` sur `#5EEAD4` | 11,56 |
| `#0F766E` sur `#F4F1EC` | 4,86 | | `#86EFAC` sur `#16302A` | 10,04 |
| `#0F5F57` sur `#DDF4EC` | 6,52 | | `#C4B5FD` sur `#241F3D` | 8,50 |
| `#4B3BB0` sur `#ECE8FB` | 6,86 | | `#FDBA74` sur `#3A2416` | 8,62 |
| `#A8432A` sur `#FDE9DF` | 5,11 | | `#FCD34D` sur `#3A2F10` | 9,14 |
| `#6B4A08` sur `#FFF1CC` | 7,17 | | `#93C5FD` sur `#13283D` | 8,33 |
| `#1E5A85` sur `#E0F0FB` | 6,31 | | `#FCA5A5` sur `#3D1716` | 8,30 |
| `#9F2F24` sur `#FDE4E1` | 5,97 | | | |

Toutes les paires passent AA. À revérifier en CC-M1 avec un outil reconnu, sur rendu réel.

## 3. Typographie

| Rôle | Police | Tailles (px) | Graisse |
|---|---|---|---|
| Titres | Bricolage Grotesque | 32 / 24 / 20 / 16 | 600 |
| Texte | DM Sans | 16 (base) / 14 / 12 | 400, 500 |
| Technique | JetBrains Mono | 13 / 12 | 400 |

- Licences : les trois polices sont distribuées sous SIL Open Font License 1.1 (à revérifier au moment de l'intégration, CLAUDE.md §3.7).
- Hébergement local des polices recommandé (pas d'appel à un CDN tiers depuis un outil privé).
- Interligne 1,5 pour le texte, 1,2 pour les titres. Chiffres tabulaires pour les métriques.

## 4. Espacement, grille, formes

- Échelle d'espacement (px) : 4, 8, 12, 16, 24, 32, 48, 64.
- Grille : 12 colonnes desktop, gouttière 24 ; 8 colonnes tablette ; 4 colonnes mobile, gouttière 16.
- Rayons : 999 (pastilles), 22 (barre latérale), 14–20 (cartes), 10 (champs, boutons).
- Ombre de carte : `0 1px 2px rgba(29,27,25,.04), 0 8px 18px -14px rgba(29,27,25,.18)`. Thème Nuit : bordure à la place de l'ombre.

## 5. Composants

| Composant | Règles |
|---|---|
| Bouton | `<button>` natif. Variantes : primaire (accent), secondaire (bordure), danger (critique). Hauteur min. 40 px (44 px mobile). |
| Carte | Titre, source + âge en pied, menu d'actions selon permissions. |
| Badge de fraîcheur | `Temps réel` · `Ancienne` · `Inconnu` · `Démonstration`. Texte toujours présent, la couleur n'est jamais seule porteuse de sens. |
| Indicateur de santé | Pastille + libellé (`OK`, `Dégradé`, `En panne`, `Inconnu`) + icône distincte par état. |
| Tableau | En-têtes collants, tri annoncé (`aria-sort`), devient liste sous 768 px. |
| Dialogue de confirmation | N2 : récapitulatif + motif obligatoire. N3 : saisie du nom de la ressource + MFA. Bouton danger à droite, focus initial sur « Annuler ». |
| Champ | Libellé visible, aide sous le champ, erreur reliée par `aria-describedby`. |
| Toast | Résultat d'action, `role="status"`, jamais seul canal d'une erreur. |

## 6. Données et états de santé

- Valeur inconnue : `—` + badge « Inconnu » + raison (« jamais mesuré », « source non connectée »). Jamais `0`, jamais une jauge vide colorée.
- Donnée ancienne : valeur à 60 % d'opacité + badge « Ancienne » + âge.
- Démonstration : badge « Données de démonstration » sur la carte et bandeau en tête de page.
- Pas de couleur d'alerte sans seuil validé et documenté.

## 7. Graphiques

- Lignes et barres simples. Pas de 3D, pas de camembert pour plus de 4 catégories.
- Axe temporel en heure locale, données stockées en UTC.
- Trous de mesure affichés comme trous, jamais interpolés.
- Alternative textuelle : dernière valeur, min, max et période sous chaque graphique.
- Bibliothèque : à choisir en CC-M1 (licence vérifiée).

## 8. Mouvement

- Survol des cartes : léger ressort (translation ≤ 2 px, 150–200 ms).
- Changement de vue : fondu + glissement de 6 px, ≤ 200 ms.
- `prefers-reduced-motion: reduce` : tout mouvement coupé, transitions d'opacité seulement.
- Aucune animation en boucle sur un indicateur, sauf état « en cours ».

## 9. Responsive

| Plage | Comportement |
|---|---|
| ≥ 1280 px | Barre latérale ouverte, 3–4 colonnes de cartes |
| 768–1279 px | Barre latérale repliée en icônes, 2 colonnes |
| < 768 px | Tiroir + onglets bas, 1 colonne, tableaux en listes |

## 10. Accessibilité

- Cible : WCAG 2.2 AA.
- Vrais éléments natifs (`<button>`, `<a>`, `<input>`).
- Focus visible teal 2 px, décalage 2 px.
- Zoom 200 % sans perte de contenu.
- Tests : clavier seul, lecteur d'écran (NVDA ou VoiceOver), contrôle automatique en CI en CC-M1.
