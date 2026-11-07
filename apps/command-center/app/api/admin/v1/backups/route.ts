import { sourced } from "@/lib/api/respond";
import { getLastBackup } from "@/lib/sources/infra";

/** Contrat admin : GET /backups — dernier passage de sauvegarde ou de test de restauration (S6). */
export async function GET() {
  return sourced(await getLastBackup());
}
