import "server-only";
import type { SourceStatus } from "./types";
import { githubConfigured, pingGithub } from "./github";

type Def = Omit<SourceStatus, "configured" | "connected" | "reason"> & { env: string[] };

/** Les 9 sources de CRM_SPEC §4. */
export const SOURCE_DEFS: Def[] = [
  { id: "S1", name: "GitHub API", feeds: "Livrables, PR, branches, CI, releases", owner: "A", phase: "CC-M1", env: ["GITHUB_REPO", "GITHUB_TOKEN"] },
  { id: "S2", name: "Dépôt · docs/adr", feeds: "Registre des décisions", owner: "A", phase: "CC-M1", env: ["GITHUB_REPO", "GITHUB_TOKEN"] },
  { id: "S3", name: "Vault Drive", feeds: "Liens vers notes et comptes rendus", owner: "A", phase: "CC-M1", env: ["DRIVE_VAULT_FOLDER_ID"] },
  { id: "S4", name: "Uptime Kuma", feeds: "Disponibilité des endpoints", owner: "A", phase: "CC-M2", env: ["UPTIME_KUMA_URL"] },
  { id: "S5", name: "Prometheus · Node Exporter", feeds: "Métriques Pi et conteneurs", owner: "A", phase: "CC-M2", env: ["PROMETHEUS_URL"] },
  { id: "S6", name: "Journal de sauvegarde", feeds: "Dernier backup, restauration", owner: "A", phase: "CC-M2", env: ["BACKUP_STATUS_URL"] },
  { id: "S7", name: "Contrat de supervision", feeds: "Santé API, versions, erreurs", owner: "B", phase: "CC-M2", env: ["APP_HEALTH_URL"] },
  { id: "S8", name: "Supabase · admin", feeds: "Comptes admin, CRM, incidents, audit", owner: "A", phase: "CC-M1 / CC-M3", env: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] },
  { id: "S9", name: "Passerelle IA", feeds: "Latence, erreurs, quotas", owner: "B", phase: "M5", env: [] },
];

const hasEnv = (keys: string[]) => keys.length > 0 && keys.every((k) => (process.env[k] ?? "").trim().length > 0);

export async function getSourceStatuses(): Promise<SourceStatus[]> {
  const githubOk = githubConfigured() ? await pingGithub() : false;
  return SOURCE_DEFS.map(({ env, ...d }) => {
    const configured = hasEnv(env);
    let connected = false;
    let reason: string | null = "non configurée";
    if (d.id === "S1" || d.id === "S2") {
      connected = githubOk;
      reason = connected ? null : configured ? "GitHub ne répond pas ou jeton refusé" : "jeton GitHub absent";
    } else if (configured) {
      reason = `connecteur prévu en ${d.phase}`;
    } else if (env.length === 0) {
      reason = `disponible en ${d.phase}`;
    }
    return { ...d, configured, connected, reason };
  });
}
