import type { NextRequest } from "next/server";
import { z } from "zod";
import { problem } from "@/lib/api/respond";
import { audited } from "@/lib/api/audit";
import { MAX_BACKUPS, backupsDir, listBackups, restoreBackup } from "@/lib/sources/partners-store";

/** Liste des instantanés automatiques des partenaires. */
export async function GET() {
  const backups = await listBackups();
  const custom = Boolean(process.env.PARTNERS_BACKUP_DIR?.trim());
  return Response.json(
    { data: backups, max: MAX_BACKUPS, location: custom ? "PARTNERS_BACKUP_DIR" : "data/backups", dir: custom ? backupsDir() : undefined },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const Restore = z.object({ name: z.string(), confirm: z.literal("RESTAURER") });

/** Restaure un instantané. Niveau 3 : { confirm: "RESTAURER" } et motif ; l'état actuel est sauvegardé avant. */
export async function POST(req: NextRequest) {
  return audited(req, { action: "partner.restore", level: 3, resource: { type: "partners", id: "all" }, github: false }, async (raw) => {
    const parsed = Restore.safeParse(raw);
    if (!parsed.success) return problem(409, "Confirmation requise", "Taper RESTAURER pour remplacer les fiches actuelles.");
    const r = await restoreBackup(parsed.data.name);
    if (!r.ok) return problem(400, "Restauration impossible", r.reason);
    return Response.json({ ok: true, count: r.count }, { headers: { "Cache-Control": "no-store" } });
  });
}
