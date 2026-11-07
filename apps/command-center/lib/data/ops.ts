/** Référentiel des départements (dossier d'architecture Command Center v0.1, CRM_SPEC §6). */
export type DeptKey = "overview" | "infrastructure" | "ai" | "automotive" | "development" | "knowledge" | "security";

export const DEPARTMENTS: { key: DeptKey; num: string; name: string; goal: string; phase: string; tone: Tone }[] = [
  { key: "overview", num: "01", name: "Executive Overview", goal: "Santé globale, sauvegardes, déploiements et incidents prioritaires.", phase: "Données réelles en CC-M2", tone: "coral" },
  { key: "infrastructure", num: "02", name: "Infrastructure", goal: "Raspberry Pi, conteneurs, cloud, réseau et certificats.", phase: "Pi installée J7–J9 · CC-M2", tone: "mint" },
  { key: "ai", num: "03", name: "AI Laboratory", goal: "Modèles, agents, RAG et évaluation, en statistiques agrégées.", phase: "Données à partir de M5", tone: "lavender" },
  { key: "automotive", num: "04", name: "Automotive", goal: "Catalogue véhicules, compatibilité OBD, règles et codes défauts.", phase: "Essais réels en M2", tone: "amber" },
  { key: "development", num: "05", name: "Development Studio", goal: "Dépôts, branches, PR, CI, releases et tickets.", phase: "GitHub · CC-M1", tone: "sky" },
  { key: "knowledge", num: "06", name: "Knowledge Center", goal: "Vault Obsidian, ADR, documentation et sources.", phase: "Index ADR · CC-M1", tone: "lavender" },
  { key: "security", num: "07", name: "Security & Incidents", goal: "Incidents, permissions, audit, certificats et sauvegardes.", phase: "Audit et actions · CC-M3", tone: "red" },
];

export type Tone = "mint" | "lavender" | "coral" | "amber" | "sky" | "red" | "neutral";

export const HEALTH_CHECKS = [
  { name: "API applicative", source: "S7 · contrat de supervision" },
  { name: "Base de données", source: "S7 · endpoint contrôlé" },
  { name: "Command Center", source: "S4 · Uptime Kuma" },
  { name: "Raspberry Pi", source: "S5 · Node Exporter" },
  { name: "Stockage", source: "S5 · Node Exporter" },
  { name: "VPN admin", source: "S4 · Tailscale ou WireGuard" },
];

export const PI_SPECS = "16 Go RAM · SSD SATA 512 Go (USB 3) · refroidissement actif";
export const PI_GAUGES = ["CPU", "RAM", "Température", "Disque"];

export const CONTAINERS: { name: string; role: string; phase: "M0" | "M0/M1" | "M1" | "M2" }[] = [
  { name: "Raspberry Pi OS 64 bits", role: "Système sur SSD, durci", phase: "M0" },
  { name: "Docker Engine · Compose", role: "Outils admin reproductibles", phase: "M0" },
  { name: "Tailscale / WireGuard", role: "Accès privé des admins", phase: "M0" },
  { name: "Uptime Kuma", role: "Disponibilité des services", phase: "M0" },
  { name: "Prometheus", role: "Collecte de métriques", phase: "M0/M1" },
  { name: "Node Exporter", role: "CPU, RAM, disque, température", phase: "M0/M1" },
  { name: "Grafana OSS", role: "Dashboards et alertes", phase: "M1" },
  { name: "cAdvisor", role: "Métriques des conteneurs", phase: "M1" },
  { name: "Loki", role: "Agrégation de logs", phase: "M2" },
  { name: "OpenTelemetry Collector", role: "Traces applicatives", phase: "M2" },
];

export const NETWORK = [
  { name: "Ports d’admin exposés", rule: "Objectif : aucun sur Internet", value: "—" },
  { name: "Tunnel privé", rule: "Tailscale ou WireGuard", value: "à choisir" },
  { name: "Certificats TLS", rule: "Alerte avant expiration", value: "aucun" },
  { name: "Accès SSH", rule: "Clés nominatives, MFA si possible", value: "non configuré" },
];

export const CLOUD = [
  { name: "Vercel", role: "Front web et previews (candidat)", ref: "ADR-0014 · après M0" },
  { name: "Supabase", role: "PostgreSQL + auth (hébergeur candidat)", ref: "ADR-0004 · Mission B" },
  { name: "VM éventuelle", role: "Backend et workers", ref: "À évaluer" },
];

export const AGENTS: { name: string; role: string; when: "Socle futur" | "MVP+" | "Après MVP" | "Plus tard" }[] = [
  { name: "Orchestrator", role: "Comprend la demande et assemble le contexte", when: "Socle futur" },
  { name: "Vehicle Context", role: "Profil, motorisation, données disponibles", when: "MVP+" },
  { name: "OBD / DTC", role: "Explique codes et mesures du moteur déterministe", when: "MVP+" },
  { name: "Maintenance", role: "Organise l’entretien selon les sources", when: "MVP+" },
  { name: "Mechanical Knowledge", role: "Principes mécaniques documentés", when: "Après MVP" },
  { name: "Electrical Knowledge", role: "Systèmes électriques et symptômes", when: "Après MVP" },
  { name: "Hybrid / EV", role: "Spécificités hybrides et électriques", when: "Plus tard" },
  { name: "Report Agent", role: "Comptes rendus clairs et sourcés", when: "Plus tard" },
  { name: "Voice / Persona", role: "Dialogue vocal et personnalisation", when: "Plus tard" },
];

export const EVAL_DIMENSIONS = [
  ["Exactitude", "sources et mesures"], ["Traçabilité", "preuve par affirmation"], ["Incertitude", "dire ce qui manque"],
  ["Sécurité", "aucun conseil dangereux"], ["Robustesse", "prompts malveillants"], ["Coût", "tokens et latence"], ["Offline", "sans réseau"],
] as const;

export const COMPAT_COLUMNS = ["Adaptateur", "Révision · firmware", "Bluetooth", "Android", "Véhicule", "Fonctions vérifiées", "Date d’essai"];

export const VAULT_FOLDERS = [
  ["00_INBOX", "notes à trier"], ["01_JOURNAL", "bilans"], ["02_REUNIONS", "comptes rendus"],
  ["03_RECHERCHES", "veille sourcée"], ["04_DECISIONS_EN_COURS", "avant ADR"], ["05_MEDIAS", "images, schémas"],
] as const;

export const REPO_DOCS: { path: string; what: string; owner: "A" | "B" | "AB" }[] = [
  { path: "docs/adr/", what: "ADR-0001 à 0015", owner: "AB" },
  { path: "docs/architecture/", what: "Architecture et contrats", owner: "AB" },
  { path: "docs/command-center/", what: "Spec, CRM, design system", owner: "A" },
  { path: "docs/operations/", what: "Pi, VPN, sauvegardes", owner: "A" },
  { path: "docs/security/", what: "Socle, menaces, accès", owner: "AB" },
  { path: "docs/automotive/", what: "OBD, moteur, mobile", owner: "B" },
  { path: "docs/ai/", what: "IA locale et passerelle", owner: "B" },
  { path: "knowledge/sources/", what: "Politique de connaissances", owner: "B" },
];

export const SEVERITIES: { label: string; tone: Tone }[] = [
  { label: "Information", tone: "sky" }, { label: "Avertissement", tone: "amber" }, { label: "Erreur", tone: "coral" }, { label: "Critique", tone: "red" },
];

export const FORBIDDEN = [
  "Terminal Linux depuis le navigateur", "Commandes libres", "Accès direct à PostgreSQL depuis le front",
  "Ports d’administration publics", "Modification de production par un agent IA", "Suppression irréversible sans validation",
];

type Cell = { label: string; tone: Tone };
const Y: Cell = { label: "Autorisé", tone: "mint" }, P: Cell = { label: "Selon périmètre", tone: "sky" },
  R: Cell = { label: "Restreint", tone: "amber" }, N: Cell = { label: "Interdit", tone: "red" }, K: Cell = { label: "Avec confirmation", tone: "lavender" };

export const PERMISSIONS: { role: string; levels: [Cell, Cell, Cell] }[] = [
  { role: "Owner", levels: [Y, Y, K] },
  { role: "Administrator", levels: [P, Y, R] },
  { role: "Developer", levels: [P, { label: "Déploiements autorisés", tone: "sky" }, R] },
  { role: "Viewer", levels: [Y, N, N] },
];
