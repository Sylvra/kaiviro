---
title: Command Center et CRM d'administration — cahier de liaison
owner: mission-a
status: DRAFT
version: 0.1
updated: 2026-11-03
---

# Command Center et CRM d'administration — cahier de liaison

Ce document relie chaque écran de la maquette validée côté style (« KAIVIRO — CRM Admin », artifact Design du 03/11/2026) à ses données : source, mode de collecte, fréquence, permissions, état « inconnu » et phase de livraison. C'est la référence de construction de `apps/command-center` en CC-M1 et au-delà.

Documents liés : [M0_PLAN](../roadmap/M0_PLAN.md) · ADMIN_ARCHITECTURE · OBSERVABILITY_CONTRACT · ADMIN_PERMISSIONS · ADR-0012, ADR-0014, ADR-0015.

## 1. Principes non négociables

1. **Aucune donnée inconnue affichée comme saine.** Chaque valeur porte sa source et l'heure de sa dernière mise à jour. Sans mesure : `—` + badge « Inconnu » + « jamais mesuré » ou l'âge de la dernière mesure.
2. **Données de démonstration signalées.** Tant qu'une source n'est pas branchée, les écrans qui montrent des exemples affichent le badge « Données de démonstration ». Jamais de chiffres inventés présentés comme réels.
3. **Le navigateur ne parle qu'à l'API d'administration.** Jamais directement à Docker, PostgreSQL, Prometheus ou GitHub. Les jetons restent côté serveur.
4. **Permissions côté serveur.** L'interface masque ce qui est interdit, mais c'est l'API qui refuse (ADMIN_PERMISSIONS).
5. **Minimisation.** Aucune conversation utilisateur, aucune position GPS, aucune donnée individuelle d'utilisateur de l'app : agrégats seulement (DATA_CLASSIFICATION, mission B).
6. **2D d'abord.** La vue 3D (CC-M4) se branche sur les mêmes endpoints ; elle est désactivable et ne bloque aucune fonction.

## 2. Direction visuelle (validée le 03/11/2026)

Inspiration de niveau de finition : templates Sable et Kanbo (buildindex.dev). On s'inspire, on ne recopie pas le code source (ADR-0015).

| Élément | Choix |
|---|---|
| Thème | Clair. Fond `#F4F1EC` (ivoire chaud), surfaces `#FFFFFF`, bordures `#ECE7DF` |
| Barre latérale | Dégradé pastel `#E6F4EE` → `#EEF0F7` → `#F1ECF8`, rayon 22 px |
| Texte | `#1D1B19` principal, `#3B3833` secondaire, `#5F5A53` discret (≥ 4,5:1 sur blanc) |
| Accent d'action | Teal `#0F766E` (survol `#115E59`), texte blanc |
| Codes couleur | Mission A menthe (`#DDF4EC` / `#0F5F57`), Mission B lavande (`#ECE8FB` / `#4B3BB0`), Commun corail (`#FDE9DF` / `#A8432A`), alerte/inconnu ambre (`#FFF1CC` / `#6B4A08`), information bleu (`#E0F0FB` / `#1E5A85`), critique rouge (`#FDE4E1` / `#9F2F24`) |
| Typographies | Bricolage Grotesque (titres), DM Sans (texte), JetBrains Mono (chemins, codes, chiffres techniques) |
| Formes | Cartes rayon 14–20 px, pastilles 999 px, ombres douces `0 1px 2px rgba(29,27,25,.04), 0 8px 18px -14px rgba(29,27,25,.18)` |
| Mouvement | Ressort léger au survol des cartes, fondu + glissement de 6 px au changement de vue ; tout coupé sous `prefers-reduced-motion` |
| Accessibilité | Vrais `<button>`/`<a>`/`<input>`, focus visible teal 2 px, contrastes vérifiés, couleur jamais seule porteuse de sens |

Stack proposée (à valider en ADR-0014) : Next.js + TypeScript, Tailwind CSS, Framer Motion, icônes Lucide. Les composants issus d'un template acheté restent isolés et hors de tout dépôt public (ADR-0015).

## 3. Structure de l'application

Deux espaces, une même coque (barre latérale + en-tête) :

- **CRM** — pilotage du projet à deux : Tableau, Planning, Équipe, Partenaires, Décisions.
- **Opérations** — les 7 départements du Command Center : Executive Overview, Infrastructure, AI Laboratory, Automotive, Development Studio, Knowledge Center, Security & Incidents.

Éléments communs : recherche globale (Ctrl/⌘ K), raccourcis avec compteurs, espaces avec progression, carte de rappel (prochain atelier), avatars des deux admins et des deux instances Claude Code, bouton « Nouveau ».

## 4. Sources de données

| # | Source | Alimente | Collecte | Fréquence | Responsable | Phase |
|---|---|---|---|---|---|---|
| S1 | GitHub API (dépôt `kaiviro`) | Livrables (issues), PR, branches, CI, releases, tickets | API admin → GitHub (jeton serveur, lecture seule) | 5 min + webhook | A | CC-M1 |
| S2 | Dépôt · `docs/adr/` | Registre des décisions, statut des ADR | Lecture des en-têtes Markdown via S1 | à chaque push sur `develop` | A | CC-M1 |
| S3 | Vault Drive | Liens vers notes, comptes rendus, recherches | Liste des fichiers (API Drive, lecture seule, dossier `VAULT` uniquement) | 15 min | A | CC-M1 |
| S4 | Uptime Kuma (Pi) | Disponibilité des endpoints | API Uptime Kuma via VPN | 1 min | A | CC-M2 |
| S5 | Prometheus + Node Exporter + cAdvisor (Pi) | CPU, RAM, température, throttling, disque, conteneurs | PromQL via API admin | 30 s | A | CC-M2 |
| S6 | Journal de sauvegarde | Dernier backup, résultat, dernier test de restauration | Fichier d'état JSON écrit par le script de sauvegarde | à chaque exécution | A | CC-M2 |
| S7 | Contrat de supervision (backend) | Santé API, versions déployées, erreurs agrégées, synchro | Endpoints `/health`, `/metrics` définis dans OBSERVABILITY_CONTRACT | 1 min | B | CC-M2 |
| S8 | Supabase · schéma `admin` | Comptes admin, rôles, incidents, audit, CRM partenaires | API admin → PostgreSQL (RLS) | temps réel | A (spec) / B (backend) | CC-M1 (CRM) · CC-M3 (audit) |
| S9 | Passerelle IA | Modèles actifs, latence, erreurs, quotas, coût | Métriques agrégées exposées par la passerelle | 1 min | B | M5 |

Règle : une source non branchée affiche « non connectée » partout où elle intervient. Le compteur « Sources connectées x / 9 » de la barre latérale reflète ce tableau.

## 5. Espace CRM

### 5.1 Tableau (kanban des livrables)
- **Contenu** : livrables par mission (Commun, A, B) en 4 colonnes : À faire, En cours, En revue, Terminé. Étiquettes mission + type, chemin dans le dépôt, échéance (J-x ou date), responsable.
- **Source** : S1. Un livrable = une issue GitHub avec labels `mission:a|b|commun`, `type:*`, champ jalon. Colonnes = statut du GitHub Project (ou labels `status:*`).
- **Actions** : déplacer une carte (niveau 2, écrit dans GitHub), filtrer par mission, ouvrir l'issue.
- **Panneau latéral** : charge par mission (terminés / total), carte Raspberry Pi (S5, sinon « non installée · aucune métrique »).
- **États** : chargement squelette ; erreur GitHub → bandeau ambre + dernière synchro ; colonne vide → « Rien ici pour l'instant ».
- **Mobile** : colonnes en défilement horizontal, filtres en haut.

### 5.2 Planning
- **Contenu** : Gantt par mission, jalons (losanges) activables, ligne du jour.
- **Source** : S1 (jalons GitHub + dates des issues). M0 : plan figé de M0_PLAN §5.
- **Actions** : basculer jalons, plage 2 / 4 semaines (CC-M1+).
- **Mobile** : liste chronologique au lieu du Gantt.

### 5.3 Équipe
- **Contenu** : Johan (Mission A), le collègue (Mission B), Claude Code A et B. Rôle, branche, périmètre, avancement, présence.
- **Source** : S8 (comptes admin, rôles) + S1 (activité, branches). Présence : dernière action dans le Command Center, jamais de suivi continu.
- **Agents** : statut dérivé de la branche (dernier commit, PR ouverte), jamais d'accès direct à l'instance.

### 5.4 Partenaires (CRM)
- **Entités** : `Partner { id, type: garage|obd_supplier|beta_tester|other, name, stage, next_action, due_at, owner_admin_id, equipment, consent_status, notes, created_at, updated_at }` ; `PartnerEvent { partner_id, at, kind, summary, by }`.
- **Étapes** (à confirmer) : À contacter → En discussion → Partenaire actif → En pause.
- **Source** : S8, tables `admin.partners`, `admin.partner_events`.
- **Actions** : créer, éditer, changer d'étape, planifier une action (niveau 2) ; supprimer (niveau 3, confirmation, journalisé).
- **Données personnelles** : nom, rôle, contact professionnel uniquement. Consentement suivi pour les bêta-testeurs. Durée de conservation définie dans DATA_CLASSIFICATION ; export et suppression sur demande.
- **Démonstration** : badge tant que S8 n'est pas branché.

### 5.5 Décisions
- **Contenu** : décisions à trancher, avec contexte, options, responsable, ADR liée, statut (À trancher / Tranchée).
- **Source** : S1 — issues label `decision` + lien vers l'ADR ; S2 pour le statut final.
- **Actions** : commenter (écrit un commentaire GitHub), marquer tranchée (ferme l'issue et rappelle d'écrire/mettre à jour l'ADR).
- **Décisions ouvertes au 03/11/2026** : périmètre du CRM (ADR-0015), étapes du pipeline, Tailscale vs WireGuard, Supabase hébergeur (ADR-0004), protection des branches (ADR-0001), nom KAIVIRO (ADR-0013).

## 6. Espace Opérations

| Dépt | Écran | Données (source) | Actions | Phase |
|---|---|---|---|---|
| 01 Executive Overview | Santé : API, base, Command Center, Pi, stockage, VPN | S4, S5, S7 | Relancer un contrôle (N2) | CC-M2 |
| | Dernier backup, dernier déploiement, incidents ouverts | S6, S1 (releases), S8 | — | CC-M2 |
| | Tableau des sources | §4 | — | CC-M1 |
| 02 Infrastructure | Pi : CPU, RAM, température, disque, uptime, throttling | S5 | — | CC-M2 |
| | Conteneurs (OS, Docker, VPN, Uptime Kuma, Prometheus, Node Exporter, Grafana, cAdvisor, Loki, OTel) | S5 (cAdvisor) + inventaire Compose | Redémarrer un conteneur autorisé (N2) | CC-M2 / CC-M3 |
| | Réseau : ports exposés (cible 0), tunnel, certificats TLS, SSH | S4 + inventaire | — | CC-M2 |
| | Cloud : Vercel, Supabase, VM éventuelle | S7 + statut fournisseurs | — | M4 |
| 03 AI Laboratory | Modèles, latence, erreurs, quotas | S9 | — | M5 |
| | Agents prévus et disponibilité | doc ORCHESTRATION_AND_AGENTS | — | CC-M1 (statique) |
| | RAG : documents indexés, version, sources en attente | Knowledge Engine (B) | — | M3 |
| | Évaluation : 7 dimensions, taux de réussite | jeux de test (B) | — | M5 |
| 04 Automotive | Versions catalogue, règles, base DTC | S2 + `packages/diagnostic-rules` | — | M1 |
| | Matrice de compatibilité (adaptateur, firmware, Bluetooth, Android, véhicule, fonctions vérifiées, date) | `packages/schemas/app` + essais | — | M2 |
| 05 Development Studio | Branches, PR, CI, releases, tickets, projets | S1 | Déclencher un workflow autorisé (N2) | CC-M1 |
| 06 Knowledge Center | Vault (dossiers, dernières notes) | S3 | Ouvrir dans Drive | CC-M1 |
| | Documentation du dépôt, registre ADR | S1, S2 | — | CC-M1 |
| 07 Security & Incidents | Incidents (id, détection, service, gravité, état, responsable, actions, résolution) | S8 | Déclarer, traiter, clore (N2) | CC-M3 |
| | Matrice des permissions | ADMIN_PERMISSIONS | Modifier un rôle (N3) | CC-M3 |
| | Journal d'audit | S8 | — | CC-M3 |
| | Certificats, sauvegardes, alertes de configuration | S4, S6 | — | CC-M2 |

Interdits par défaut (dossier d'architecture §7) : terminal dans le navigateur, commandes libres, accès direct à PostgreSQL depuis le front, ports d'administration publics, modification de production par un agent IA, suppression irréversible sans validation.

## 7. Permissions

| Rôle | Niveau 1 · Consultation | Niveau 2 · Opérations contrôlées | Niveau 3 · Administration sensible |
|---|---|---|---|
| Owner | Tout | Toutes les actions autorisées | Avec confirmation renforcée |
| Administrator | Selon périmètre | Opérations autorisées | Restreint |
| Developer | Développement et logs autorisés | Déploiements autorisés | Restreint |
| Viewer | Consultation | Interdit | Interdit |

Chaque action N2/N3 vérifie identité, rôle, périmètre, autorisation, conditions de sécurité, confirmation humaine ; elle est journalisée (admin, action, ressource, date, résultat, corrélation, motif). Jamais de secret dans les logs.

## 8. API d'administration (squelette pour `packages/api-contracts/admin/`)

| Méthode | Route | Rôle min. | Source |
|---|---|---|---|
| GET | `/admin/v1/sources` | Viewer | état de S1–S9 |
| GET | `/admin/v1/overview` | Viewer | S1, S4–S8 agrégés |
| GET | `/admin/v1/deliverables?mission=` | Viewer | S1 |
| PATCH | `/admin/v1/deliverables/{id}` (statut) | Developer | S1 (écriture) |
| GET | `/admin/v1/decisions` · POST `/admin/v1/decisions/{id}/comments` | Viewer · Developer | S1 |
| GET/POST/PATCH | `/admin/v1/partners` · `/admin/v1/partners/{id}` | Administrator | S8 |
| DELETE | `/admin/v1/partners/{id}` | Owner (N3) | S8 |
| GET | `/admin/v1/infra/pi` · `/admin/v1/infra/containers` | Viewer | S5 |
| POST | `/admin/v1/infra/containers/{name}/restart` | Administrator (N2) | orchestration autorisée |
| GET | `/admin/v1/backups` | Viewer | S6 |
| GET/POST/PATCH | `/admin/v1/incidents` | Viewer / Administrator | S8 |
| GET | `/admin/v1/audit` | Owner | S8 |

Chaque réponse porte `source`, `fetched_at`, `freshness` (`live|stale|unknown`) et, si démonstration, `demo: true`.

## 9. Ordre de livraison

1. **CC-M1** — coque, navigation, design system, CRM complet (Tableau, Planning, Équipe, Partenaires, Décisions) sur S1, S2, S3 et S8 (partenaires) ; Opérations en 2D avec états « inconnu » et tableau des sources.
2. **CC-M2** — S4, S5, S6, S7 : Executive Overview et Infrastructure en données réelles, alertes.
3. **CC-M3** — audit, incidents, actions N2/N3, matrice des permissions éditable.
4. **CC-M4** — vue 3D de l'agence, branchée sur les mêmes endpoints.
5. **CC-M5** — assistant d'administration en lecture seule.

## 10. Points ouverts

- Périmètre final du CRM (registre des accès et du matériel ? retours utilisateurs agrégés en M7 ?).
- Étapes du pipeline partenaires.
- GitHub Issues + Project comme source des livrables : à confirmer ensemble (convention de labels).
- Hébergement du Command Center (Vercel derrière accès privé, ou servi depuis la Pi via VPN) : ADR-0014.
- Choix Tailscale / WireGuard : NETWORK_AND_VPN.
