/**
 * Données de référence issues de docs/roadmap/M0_PLAN.md (v0.4) et docs/command-center/CRM_SPEC.md.
 * Ce sont des faits du plan, pas des mesures : fraîcheur "static".
 * Dès que S1 (GitHub) est branché, les livrables et décisions viennent des issues.
 */
export const PLAN_SOURCE = "docs/roadmap/M0_PLAN.md";

export type Owner = "A" | "B" | "C" | "H";
export type Status = 0 | 1 | 2 | 3; // À faire, En cours, En revue, Terminé

export const STATUS_LABELS = ["À faire", "En cours", "En revue", "Terminé"] as const;

export interface Deliverable {
  id: string;
  owner: Owner;
  title: string;
  path: string;
  /** jours ouvrés du plan, ex. [1, 2] = J1–J2 */
  days: [number, number];
  kind: string;
  status: Status;
  url?: string;
}

export const DELIVERABLES: Deliverable[] = [
  { id: "c1", owner: "C", title: "Créer le dépôt GitHub kaiviro", path: "github.com/Sylvra/kaiviro", days: [1, 1], kind: "Setup", status: 0 },
  { id: "c2", owner: "C", title: "Vault Obsidian sur Drive", path: "PROJECT - KAIVIRO/VAULT", days: [1, 1], kind: "Docs", status: 3 },
  { id: "c3", owner: "C", title: "Pack M0 v0.5 rédigé", path: "CLAUDE.md · M0_PLAN.md · CRM_SPEC.md", days: [1, 1], kind: "Docs", status: 3 },
  { id: "c4", owner: "C", title: "Protéger main et develop", path: "Settings › Branches", days: [1, 1], kind: "Setup", status: 0 },
  { id: "c5", owner: "C", title: "Ajouter le collègue au dépôt", path: "Settings › Collaborators", days: [1, 1], kind: "Accès", status: 0 },
  { id: "c6", owner: "C", title: "Lancer les deux missions Claude Code", path: "kaiviro-claude-a · kaiviro-claude-b", days: [1, 1], kind: "Setup", status: 0 },
  { id: "a1", owner: "A", title: "Architecture d’administration", path: "docs/architecture/ADMIN_ARCHITECTURE.md", days: [1, 2], kind: "Doc", status: 0 },
  { id: "a2", owner: "A", title: "Contrat de supervision", path: "docs/architecture/OBSERVABILITY_CONTRACT.md", days: [3, 4], kind: "Contrat", status: 0 },
  { id: "a3", owner: "A", title: "Permissions administrateurs", path: "docs/security/ADMIN_PERMISSIONS.md", days: [3, 4], kind: "Sécurité", status: 0 },
  { id: "a4", owner: "A", title: "Spécification Command Center + CRM", path: "docs/command-center/", days: [5, 6], kind: "Spec", status: 1 },
  { id: "a5", owner: "A", title: "Raspberry Pi, VPN, conteneurs", path: "docs/operations/ · infrastructure/", days: [7, 8], kind: "Infra", status: 0 },
  { id: "a6", owner: "A", title: "Sauvegarde + restauration testée", path: "docs/operations/BACKUP_AND_RESTORE.md", days: [9, 9], kind: "Infra", status: 0 },
  { id: "a7", owner: "A", title: "Rapport de mission A", path: "docs/roadmap/M0_ADMIN_REPORT.md", days: [10, 10], kind: "Rapport", status: 0 },
  { id: "b1", owner: "B", title: "Vision, périmètre, personas", path: "docs/product/", days: [1, 2], kind: "Produit", status: 0 },
  { id: "b2", owner: "B", title: "Périmètre OBD + moteur déterministe", path: "docs/automotive/", days: [3, 4], kind: "Auto", status: 0 },
  { id: "b3", owner: "B", title: "Schémas OBD et diagnostic", path: "packages/schemas/app/", days: [3, 4], kind: "Contrat", status: 0 },
  { id: "b4", owner: "B", title: "Architecture, domaine, contrats API", path: "docs/architecture/", days: [5, 6], kind: "Doc", status: 0 },
  { id: "b5", owner: "B", title: "Mobile + IA (local et passerelle)", path: "docs/automotive/ · docs/ai/", days: [7, 8], kind: "IA", status: 0 },
  { id: "b6", owner: "B", title: "Politique de connaissances", path: "knowledge/sources/", days: [9, 9], kind: "Doc", status: 0 },
  { id: "b7", owner: "B", title: "Rapport de mission B", path: "docs/roadmap/M0_APP_REPORT.md", days: [10, 10], kind: "Rapport", status: 0 },
];

export const MILESTONES = [
  { days: [3, 4] as [number, number], label: "Atelier contrats" },
  { days: [5, 6] as [number, number], label: "Revue intermédiaire" },
  { days: [10, 10] as [number, number], label: "Recette · tag m0.1.0" },
];

export type AdrStatus = "PROPOSED" | "ACCEPTED" | "REJECTED" | "SUPERSEDED" | "OPEN" | "NOT_WRITTEN";
export interface Adr { id: string; subject: string; owner: Owner; status: AdrStatus; url?: string }

/** Registre prévu par le plan (§3). Statut réel lu dans docs/adr/ quand S2 est branché. */
export const ADRS: Adr[] = [
  ["ADR-0001", "Monorepo et collaboration", "A"], ["ADR-0002", "Architecture hybride offline-first", "B"],
  ["ADR-0003", "Backend — monolithe modulaire", "B"], ["ADR-0004", "Persistance cloud — PostgreSQL", "B"],
  ["ADR-0005", "Données locales mobile — SQLite", "B"], ["ADR-0006", "Plateforme Android", "B"],
  ["ADR-0007", "Sécurité automobile — lecture seule", "B"], ["ADR-0008", "IA — passerelle et runtime local", "B"],
  ["ADR-0009", "Connaissances et documentation", "B"], ["ADR-0010", "Observabilité et Raspberry Pi", "A"],
  ["ADR-0011", "Secrets et accès", "A"], ["ADR-0012", "Command Center — accès et autorisations", "A"],
  ["ADR-0013", "Marque KAIVIRO", "H"], ["ADR-0014", "Stack front Command Center et 3D", "A"],
  ["ADR-0015", "CRM d’administration et template tiers", "A"],
].map(([id, subject, owner]) => ({ id: id!, subject: subject!, owner: owner as Owner, status: "NOT_WRITTEN" as AdrStatus }));

export interface Decision {
  key: string; title: string; ref: string; owner: Owner; summary: string; context: string; options: string[];
  resolved: boolean; url?: string;
}

export const DECISIONS: Decision[] = [
  { key: "crm", title: "Périmètre du CRM", ref: "ADR-0015", owner: "H", summary: "Quels modules pour nous deux ?", resolved: false,
    context: "Le CRM est réservé aux deux administrateurs et intégré au Command Center. Le style s’inspire de templates achetés, les modules sont à définir selon nos besoins réels.",
    options: ["Partenaires, testeurs et fournisseurs d’adaptateurs", "Pilotage : livrables, jalons, décisions liées aux ADR", "Registre des accès et du matériel de test", "Retours utilisateurs agrégés (plus tard, M7)"] },
  { key: "pipeline", title: "Étapes du pipeline partenaires", ref: "CRM_SPEC §5.4", owner: "H", summary: "À contacter → En discussion → Actif → Pause", resolved: false,
    context: "Quatre étapes proposées pour suivre garages testeurs, fournisseurs OBD et bêta-testeurs.",
    options: ["Garder les quatre étapes", "Ajouter « Convention signée » avant « Actif »", "Un pipeline par type de partenaire"] },
  { key: "vpn", title: "Accès privé : Tailscale ou WireGuard", ref: "NETWORK_AND_VPN", owner: "A", summary: "Accès admin à la Pi, aucun port exposé", resolved: false,
    context: "Le Command Center et la Pi ne doivent être joignables que par un réseau privé. Comparaison à faire avant J7.",
    options: ["Tailscale : mise en place rapide, accès mobile simple, service tiers", "WireGuard : auto-hébergé, plus de configuration et de maintenance"] },
  { key: "supabase", title: "Supabase comme hébergeur PostgreSQL", ref: "ADR-0004", owner: "B", summary: "Hébergeur candidat, portabilité exigée", resolved: false,
    context: "Le cahier des charges exige PostgreSQL et une sortie possible vers un PostgreSQL standard.",
    options: ["Supabase (base + auth) avec plan de sortie documenté", "PostgreSQL managé ailleurs + auth séparée", "Décider après un prototype en M4"] },
  { key: "branches", title: "Protection des branches", ref: "ADR-0001", owner: "H", summary: "Disponible selon l’offre GitHub", resolved: false,
    context: "Sur GitHub Free, la protection des branches n’existe pas pour un dépôt privé. La règle « PR obligatoire » reste alors écrite dans CLAUDE.md.",
    options: ["Passer en GitHub Pro", "Garder la règle écrite et la discipline de revue", "Créer une organisation GitHub et réévaluer"] },
  { key: "marque", title: "Disponibilité du nom KAIVIRO", ref: "ADR-0013", owner: "H", summary: "INPI, EUIPO, OMPI et domaines", resolved: false,
    context: "KAIVIRO est un nom de travail. Vérifier marques déposées et noms de domaine avant tout branding définitif.",
    options: ["Recherche INPI / EUIPO / OMPI", "Vérifier domaines et stores", "Garder un nom de repli"] },
];

export const PEOPLE = [
  { id: "jb", initials: "JB", name: "Johan", role: "Owner · Administration & Opérations", mission: "A" as const, kind: "human" as const,
    branch: "feature/m0-admin-operations", scope: ["Command Center", "CRM", "Vue 3D", "Raspberry Pi", "VPN", "Accès", "Sauvegardes", "GitHub"] },
  { id: "b", initials: "B", name: "Collègue", role: "Stack applicative", mission: "B" as const, kind: "human" as const,
    branch: "feature/m0-app-stack", scope: ["Android", "OBD", "Moteur déterministe", "Backend", "Supabase", "IA", "Connaissances"] },
  { id: "cca", initials: "A", name: "Claude Code A", role: "Agent · worktree kaiviro-claude-a", mission: "A" as const, kind: "agent" as const,
    branch: "prompts/MISSION_A.md", scope: ["Rédige, ne déploie pas", "Pas d’accès à la Pi", "PR vers develop"] },
  { id: "ccb", initials: "B", name: "Claude Code B", role: "Agent · worktree kaiviro-claude-b", mission: "B" as const, kind: "agent" as const,
    branch: "prompts/MISSION_B.md", scope: ["Aucun fait automobile inventé", "PR vers develop"] },
];

/** Durée du plan M0 en jours ouvrés. Le jour courant est calculé par getPlanDay() (lib/queries.ts). */
export const PLAN_DAY = { total: 10 };
