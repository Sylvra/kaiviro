---
title: Plan M0 — Fondations KAIVIRO
owner: humans
status: PROPOSED
version: 0.4
updated: 2026-11-03
---

# Plan M0 — Fondations KAIVIRO

Version 0.4 : répartition du travail par développeur (Administration & Opérations / Stack applicative). Réconcilie le pack de lancement initial avec le Cahier des charges v0.1 et le Dossier d'architecture Command Center v0.1. En cas de contradiction, **le cahier des charges fait référence**, sauf décision contraire notée ici.

## 1. Arbitrages

| # | Sujet | Arbitrage |
|---|---|---|
| 1 | Listes d'ADR incompatibles | Liste unique ADR-0001 à ADR-0015 (§3) |
| 2 | Monorepo en microservices | Monolithe modulaire `services/backend` (cahier §5.3) |
| 3 | Pi en M0 | Les instances Claude **rédigent** Compose, scripts et docs ; **seul l'humain responsable** les applique sur la Pi |
| 4 | `CLAUDE.md` | Rédigé par les humains avant le lancement |
| 5 | Livrables du cahier | Tous répartis entre A et B (§4) |
| 6 | Chemin critique automobile | Mission B, prioritaire |
| 7 | Répartition | **Par développeur** : A = Administration & Opérations, B = Stack applicative (y compris toute l'IA) |
| 8 | Documentation | Vault Obsidian sur Drive = mémoire projet (humains). Git = documentation d'ingénierie. Aucun fichier dans les deux ; décision du vault → ADR. Écart avec le cahier §10.5 consigné dans ADR-0009 |
| 9 | Secrets | Dossier Drive restreint aux 2 humains ; ADR-0011 décrit l'usage réel et la cible ; aucun accès Claude |
| 10 | Command Center 3D | Spécifié en M0 (ADR-0014), réalisé après la 2D et branché sur des **données réelles** |
| 11 | CRM d'administration | Back-office premium pour les 2 admins, intégré au Command Center ; inspiration template achetée, licence encadrée par ADR-0015 |

## 2. Structure du dépôt

```
kaiviro/
├── CLAUDE.md  README.md            # humains
├── CONTRIBUTING.md  SECURITY.md    # A
├── .gitignore                      # socle humains, enrichi par A
├── .github/                        # A : templates, CODEOWNERS, dependabot, CI de contrôle
├── .claude/skills/                 # A : skills admin/ops — B : skills app
├── apps/
│   ├── android/                    # B — vide en M0
│   └── command-center/             # A — vide en M0 (Command Center + CRM)
├── services/
│   └── backend/                    # B — monolithe modulaire (le module admin y est spécifié par A, voir §4)
├── packages/
│   ├── api-contracts/
│   │   ├── app/                    # B : mobile ↔ API, sync, knowledge
│   │   └── admin/                  # A : API d'administration, CRM, audit
│   ├── schemas/
│   │   ├── app/                    # B : domaine, OBD, diagnostic
│   │   └── ops/                    # A : santé, métriques, incidents, audit
│   ├── shared-types/               # B
│   └── diagnostic-rules/           # B
├── knowledge/                      # B (politique + gabarits)
├── infrastructure/
│   ├── raspberry-pi/               # A
│   ├── monitoring/                 # A
│   ├── network/                    # A (VPN, pare-feu, DNS internes)
│   ├── backups/                    # A
│   └── cloud/                      # B (environnements applicatifs)
├── docs/
│   ├── product/                    # B
│   ├── architecture/               # B (app) — A : OBSERVABILITY_CONTRACT.md, ADMIN_ARCHITECTURE.md
│   ├── automotive/                 # B
│   ├── ai/                         # B
│   ├── security/                   # A : socle, menaces, accès admin — B : APP_SECURITY.md, DATA_CLASSIFICATION.md
│   ├── operations/                 # A
│   ├── command-center/             # A (Command Center, CRM, design system, 3D)
│   ├── adr/                        # propriétaire selon l'ADR
│   └── roadmap/                    # humains + rapports A et B
└── tests/                          # chacun dans son périmètre
```

## 3. Liste unique des ADR

| ADR | Sujet | Proposition initiale | Propriétaire | Relecteur |
|---|---|---|---|---|
| 0001 | Monorepo et collaboration | Monorepo, `main`/`develop` protégées, PR + 1 approbation, worktrees séparés | A | B |
| 0002 | Architecture hybride offline-first | Mobile autonome + cloud facultatif + Pi admin uniquement | B | A |
| 0003 | Backend | Monolithe modulaire, frontières internes explicites | B | A |
| 0004 | Persistance cloud | PostgreSQL + stockage objet ; Supabase hébergeur candidat, portabilité exigée | B | A |
| 0005 | Données locales mobile | SQLite, migrations versionnées, sync idempotente | B | A |
| 0006 | Plateforme Android | Kotlin + Jetpack Compose (alternatives comparées) | B | A |
| 0007 | Sécurité automobile | OBD lecture seule, aucune commande véhicule, pas d'effacement DTC | B | A |
| 0008 | IA | Passerelle multi-fournisseurs + runtime local + garde-fous déterministes | B | A |
| 0009 | Connaissances et documentation | Fiches dans Git ; vault Obsidian sur Drive ; règle vault → ADR | B | humains |
| 0010 | Observabilité et Pi | Uptime Kuma → Prometheus/Node Exporter → Grafana → Loki, par étapes | A | B |
| 0011 | Secrets et accès | Usage actuel + cible (coffre chiffré, rotation, comptes nominatifs) | A | humains |
| 0012 | Command Center : accès et autorisations | VPN privé, rôles côté serveur, audit, actions par niveaux | A | B |
| 0013 | Marque | KAIVIRO temporaire, vérification INPI/EUIPO/OMPI + domaines | humains | — |
| 0014 | Stack front Command Center et 3D | Next.js/TS, 2D d'abord ; Three.js / React Three Fiber comparés, 3D désactivable | A | B |
| 0015 | CRM d'administration et template tiers | Périmètre du CRM, hébergement, licence du template (usage, non-redistribution, dépôt public futur) | A | humains |

Toutes au statut PROPOSED jusqu'à la revue commune.

## 4. Propriété des livrables M0

### Mission A — Administration & Opérations (Johan)
- `docs/command-center/` : COMMAND_CENTER_SPEC (7 départements, version 2D), COMMAND_CENTER_NAVIGATION, CRM_SPEC, DESIGN_SYSTEM, COMMAND_CENTER_3D (cadrage + choix moteur)
- `docs/architecture/ADMIN_ARCHITECTURE.md` : Command Center, API d'administration, module `admin` du backend, flux de supervision
- `docs/architecture/OBSERVABILITY_CONTRACT.md` : endpoints de santé, métriques, événements de release attendus de l'app
- `docs/security/` : SECURITY_BASELINE, THREAT_MODEL (infra + admin), ADMIN_PERMISSIONS, ACCESS_MANAGEMENT
- `docs/operations/` : RASPBERRY_PI_ADMIN_CENTER, NETWORK_AND_VPN, CONTAINERS, BACKUP_AND_RESTORE, INCIDENT_MANAGEMENT
- `infrastructure/raspberry-pi|monitoring|network|backups` : Compose et scripts **proposés**, sans secret
- `packages/api-contracts/admin/`, `packages/schemas/ops/`
- ADR 0001, 0010, 0011, 0012, 0014, 0015
- GitHub : `.gitignore`, CONTRIBUTING, SECURITY, templates, CODEOWNERS, dependabot, CI de contrôle
- `docs/roadmap/M0_ADMIN_REPORT.md`

### Mission B — Stack applicative (collègue)
- `docs/product/` : PRODUCT_VISION, PRODUCT_SCOPE, PERSONAS, USER_JOURNEYS
- `docs/automotive/` : OBD_SCOPE, DETERMINISTIC_ENGINE, ADAPTER_COMPATIBILITY_METHOD, MOBILE_ARCHITECTURE, MOBILE_UX
- `docs/architecture/` : SYSTEM_ARCHITECTURE, TECH_STACK, DATA_FLOW, DEPLOYMENT_MODEL, DOMAIN_MODEL, API_CONTRACTS
- `docs/ai/` : ON_DEVICE_AI, AI_GATEWAY, ORCHESTRATION_AND_AGENTS, AI_EVALUATION
- `docs/security/APP_SECURITY.md`, `docs/security/DATA_CLASSIFICATION.md`
- `knowledge/sources/KNOWLEDGE_POLICY.md` + gabarit
- `packages/api-contracts/app/`, `packages/schemas/app/`, `packages/shared-types/`, `packages/diagnostic-rules/`
- ADR 0002 à 0009
- `docs/roadmap/M0_APP_REPORT.md`

### Humains
`README.md`, `CLAUDE.md`, ce plan, ADR-0013, application des configurations sur la Pi, coffre de secrets, protection des branches, validation des ADR, vault Obsidian, achat et conservation de la licence du template CRM.

### Points de contact A ↔ B
Aucun fichier n'est édité par les deux missions :
- **Supervision** : A rédige `OBSERVABILITY_CONTRACT.md` (ce que le Command Center attend) ; B y répond dans son rapport et l'intègre dans `API_CONTRACTS`.
- **Module admin du backend** : B possède `services/backend` ; A spécifie le module `admin` dans `ADMIN_ARCHITECTURE.md` et `packages/api-contracts/admin/`.
- **Rôles et permissions** : `ADMIN_PERMISSIONS.md` (A) fait référence pour les comptes administrateurs ; l'authentification des utilisateurs de l'app relève de B.
- **Données affichées dans le Command Center** : agrégées et minimisées selon `DATA_CLASSIFICATION.md` (B).

## 5. Calendrier indicatif (2 semaines)

| Jours | Commun | Mission A (Johan) | Mission B (collègue) |
|---|---|---|---|
| J1–J2 | Dépôt, protections, CLAUDE.md, ADR-0013 | Analyse, ADR-0001, ADMIN_ARCHITECTURE | Vision, scope, personas, SYSTEM_ARCHITECTURE |
| J3–J4 | **Atelier contrats** (supervision, module admin) | OBSERVABILITY_CONTRACT, ADMIN_PERMISSIONS | OBD_SCOPE, DETERMINISTIC_ENGINE, schémas |
| J5–J6 | Revue intermédiaire | COMMAND_CENTER_SPEC, CRM_SPEC, ADR-0012/0014/0015 | ADR 0002–0006, DOMAIN_MODEL, API_CONTRACTS |
| J7–J8 | — | Pi : OS sur SSD, durcissement, VPN, Docker (appliqué par Johan) | Mobile, IA (local + passerelle), ADR 0007–0008 |
| J9 | — | Pi : Uptime Kuma, Node Exporter, sauvegarde + **restauration test** | Connaissances, ADR-0009, DATA_CLASSIFICATION |
| J10 | Revue croisée, validation ADR, merge, tag `m0.1.0` | Rapport | Rapport |

## 6. Recette M0

- [ ] Dépôt structuré, `main`/`develop` protégées (ou règle écrite si GitHub Free), templates et CI de contrôle actifs
- [ ] `CLAUDE.md` versionné ; périmètres A/B explicites ; aucun fichier co-édité
- [ ] ADR 0001–0012, 0014, 0015 relues et tranchées ; 0013 en cours
- [ ] Contrats suffisants pour démarrer M1 (app : véhicule + OBD simulé ; admin : Command Center 2D sur données de démonstration identifiées)
- [ ] `OBSERVABILITY_CONTRACT` validé par les deux
- [ ] Aucun secret dans Git (scan exécuté)
- [ ] Pi : OS sur SSD, accès VPN uniquement, Docker Compose, Uptime Kuma, durcissement
- [ ] Sauvegarde effectuée **et** restauration de test réussie
- [ ] Licence du template CRM vérifiée et consignée (ADR-0015)
- [ ] Vault Obsidian structuré, hors dossier credentials ; aucun dépôt Git dans un dossier synchronisé
- [ ] Deux rapports disponibles, contradictions résolues, backlog M1 en issues GitHub

## 7. Après M0

- **App (B)** — M1 : squelette Android, profil véhicule, simulateur OBD, moteur déterministe initial.
- **Admin (A)** — CC-M1 : Command Center 2D + CRM sur données de démonstration clairement identifiées ; CC-M2 : supervision réelle depuis la Pi ; CC-M3 : actions administratives et audit ; CC-M4 : vue 3D branchée sur les données réelles.

## 8. Hors M0

Développement applicatif, développement du Command Center, base distante, compte cloud, scène 3D, installation de framework, données utilisateur réelles, déploiement.
