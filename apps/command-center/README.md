---
title: Command Center — application
owner: mission-a
status: DRAFT
version: 0.1
updated: 2026-11-03
---

# KAIVIRO Command Center

CRM d'administration et opérations des deux administrateurs. Spécification : [CRM_SPEC](../../docs/command-center/CRM_SPEC.md).

## Démarrer (poste local uniquement)

```powershell
cd apps/command-center
npm ci
copy .env.example .env.local   # puis remplir soi-même, jamais dans Git
npm run dev                     # http://127.0.0.1:3000
```

Le serveur écoute **uniquement sur 127.0.0.1** : pas d'authentification avant CC-M3 (ADR-0012). Ne jamais l'exposer sur un réseau.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | développement local |
| `npm run build` | build de production (contrôle) |
| `npm run typecheck` | TypeScript strict |
| `npm test` | tests Vitest (fraîcheur, sources, « aucune valeur sans source ») |

## Structure

```
app/
  crm/{tableau,planning,equipe,partenaires,decisions}   espace CRM
  ops/[dept]                                            7 départements
  api/admin/v1/*                                        API d'administration (lecture)
components/                                             coque, kanban, Gantt, CRM, UI
lib/
  sources/   types Sourced<T>, fraîcheur, registre S1–S9, connecteur GitHub
  data/      plan M0 (référence), référentiel ops
  partners.ts  CRM Partenaires : types, validation, références
  sources/partners-store.ts  stockage local apps/command-center/data/partners.json (ignoré par Git)
  queries.ts une fonction par donnée, live si la source répond, sinon référence ou démo signalée
tests/
```

## Règles

- Chaque valeur est un `Sourced<T>` : source, horodatage, fraîcheur (`live | stale | unknown | static`), drapeau `demo`.
- Sans source branchée : `—`, « Inconnu », « jamais mesuré ». Jamais de vert par défaut.
- Le navigateur n'appelle que `/api/admin/v1/*` ; les jetons restent côté serveur.
- Écriture GitHub (statut d'un livrable) : route présente, désactivée (`501`) jusqu'à ADR-0012.
