# KAIVIRO NEXUS — front (NX-1, connecteur S1)

Plateforme d'opérations KAIVIRO : projet, infrastructure, administration.
Spécification : [`docs/command-center/NEXUS_SPEC_V2.md`](../../docs/command-center/NEXUS_SPEC_V2.md) · décision : ADR-0016 (PROPOSED).

## État

- Socle du front, fidèle aux maquettes NX-0 validées le 2026-11-10.
- **S1 GitHub branché, en lecture seule.** Tâches, avancement M0, activité, décisions et CI viennent du dépôt, avec un cache de 5 minutes. Sans `GITHUB_TOKEN`, ou si GitHub ne répond pas, NEXUS revient aux données d'exemple et l'affiche dans la barre de page.
- **S5 Raspberry Pi branché, en lecture seule.** CPU, mémoire, température, disques, ventilateur et services systemd viennent de Prometheus (cache de 30 secondes). Si Prometheus ne répond pas, la Pi passe à « Inconnu ». Aucun seuil d'alerte n'est affiché tant qu'il n'a pas été fixé après observation.
- **Sauvegardes, API d'administration, Uptime Kuma : non branchés.** Ils restent « Inconnu ».
- Aucune écriture : les boutons d'action sont visibles mais inactifs, avec la raison au survol.
- NEXUS ne fait que lire Prometheus sur la Pi. Il n'y exécute rien.

## Pages

| Route | Contenu |
| --- | --- |
| `/` | Overview : avancement M0, à traiter, missions, activité, infrastructure |
| `/projet` | Project Management : projet M0, jalons, décisions GitHub à trancher (`?d=<id>`) |
| `/connaissances` | Knowledge Center : registre des ADR de develop, statut et décisions liées |
| `/taches` | Tâches en table ou kanban (`?vue=kanban`), aperçu de la tâche (`?t=<id>`) |
| `/infrastructure/carte` | Carte topologique ou table (`?vue=table`) |
| `/infrastructure/services` | Containers & Services : services systemd suivis, conteneurs, API du backend |
| `/infrastructure/supervision` | Monitoring & Metrics : cibles Prometheus, séries, règles d’alerte, moniteurs |
| `/infrastructure/cloud` | Cloud Services : GitHub et Tailscale mesurés, Supabase et Vercel candidats |
| `/infrastructure/stockage` | Backups & Storage : disques, santé SMART, sauvegardes prévues, mises à jour en attente |
| `/equipe` | Team & Members : membres saisis dans NEXUS, charge par mission (S1) |
| `/reglages` | Settings : état des sources S1 à S9 |
| `/infrastructure/noeuds/raspberry-pi-5` | Fiche de nœud : métriques, services, relations, chronologie |

Recherche rapide : `Ctrl K`. Thème clair ou sombre : bouton de la barre, choix mémorisé dans le navigateur.

## Commandes

```bash
npm install
npm run dev        # http://127.0.0.1:3000
npm run typecheck
npm test
npm run build
```

## Structure

- `app/` : routes Next.js (App Router).
- `components/` : shell (navigation, barre, recherche, thème), graphiques, primitives d'interface.
- `lib/types.ts` : modèle d'objets (états, provenance, tâche, nœud).
- `lib/etats.ts` : jetons d'état. Une couleur n'est jamais seule, un libellé l'accompagne.
- `lib/charts.ts` : géométrie SVG pure, testée.
- `lib/donnees.ts` : point d'entrée des pages. Choisit S1 ou l'exemple.
- `lib/s1/github.ts` : lecture GitHub, GET uniquement, jeton côté serveur.
- `lib/s1/mapping.ts` : conversion des issues, événements et CI en objets NEXUS, testée.
- `lib/s1/decisions.ts` : issues `decision` vers objets Décision, testé.
- `lib/s2/adr.ts` : en-têtes des ADR vers registre, testé.
- `lib/s5/prometheus.ts` : lecture de Prometheus, GET uniquement.
- `lib/s5/stockage.ts` : disques et SMART vers objets NEXUS, testé.
- `lib/s5/mapping.ts` : requêtes PromQL et conversion en fiche de nœud, testée.
- `lib/data/exemple.ts` : données d'exemple, utilisées sans connecteur.
- `.env.example` : variables attendues, sans valeur réelle.
- `app/globals.css` : design system V2 (jetons clair et sombre).

## Dépendances

Sous-ensemble de la pile déjà validée pour CC-M1, mêmes versions épinglées : Next.js, React, Tailwind CSS, TypeScript, Vitest (licences MIT et Apache-2.0).
Polices Hanken Grotesk et JetBrains Mono (SIL OFL) via `next/font`, auto-hébergées au build.
