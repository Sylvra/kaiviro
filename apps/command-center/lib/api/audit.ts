import "server-only";
import { randomUUID } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";
import { problem } from "./respond";
import { guardWrite } from "./guard";

/**
 * Journal d'audit en ajout seul (ADMIN_PERMISSIONS §6, schéma packages/schemas/ops/audit-event.schema.json).
 * CC-M1 : fichier local JSON Lines, ignoré par Git (data/). Remplaçable par la table admin.audit_events (S8).
 * Sans authentification avant CC-M3, toute action est attribuée à l'administrateur local (serveur lié à 127.0.0.1).
 */
export type AuditOutcome = "requested" | "denied" | "succeeded" | "failed";

export interface AuditEvent {
  id: string;
  at: string;
  actor: { type: "admin" | "system" | "ci"; id: string; role: "owner" | "administrator" | "developer" | "viewer" | null };
  action: string;
  level: 1 | 2 | 3;
  resource: { type: string; id: string };
  outcome: AuditOutcome;
  reason: string | null;
  correlation_id: string;
}

const LOCAL_ACTOR: AuditEvent["actor"] = { type: "admin", id: "local-admin", role: "owner" };

// turbopackIgnore : fichier de données écrit à l'exécution.
export const auditFile = () => process.env.AUDIT_FILE?.trim() || path.join(/* turbopackIgnore: true */ process.cwd(), "data", "audit.jsonl");

/** Ajoute une ligne au journal. Lève une erreur si l'écriture échoue : une action non journalisée n'est pas exécutée. */
export async function appendAudit(e: Omit<AuditEvent, "id" | "at" | "actor">): Promise<AuditEvent> {
  const event: AuditEvent = { id: randomUUID(), at: new Date().toISOString(), actor: LOCAL_ACTOR, ...e };
  const file = auditFile();
  await mkdir(path.dirname(file), { recursive: true });
  await appendFile(file, `${JSON.stringify(event)}\n`, "utf8");
  return event;
}

/** Motif de l'action : en-tête X-Kaiviro-Reason (encodé URI) ou champ `reason` du corps. 3 à 500 caractères. */
export function reasonOf(req: Pick<NextRequest, "headers">, body: unknown): string | null {
  const header = req.headers.get("x-kaiviro-reason");
  let raw = "";
  if (header) {
    try { raw = decodeURIComponent(header); } catch { raw = header; }
  } else if (body && typeof body === "object" && typeof (body as { reason?: unknown }).reason === "string") {
    raw = (body as { reason: string }).reason;
  }
  const r = raw.trim();
  return r.length >= 3 && r.length <= 500 ? r : null;
}

export interface AuditMeta {
  /** identifiant d'action de la liste blanche, ex. deliverable.update, partner.delete ; ou fonction du corps */
  action: string | ((body: unknown) => string);
  level: 2 | 3;
  resource: { type: string; id: string };
  /** la garde exige-t-elle GitHub ? (par défaut oui) */
  github?: boolean;
}

/**
 * Exécute une écriture de niveau 2 ou 3 : garde (lib/api/guard.ts), motif obligatoire,
 * puis journalisation « requested » avant l'action et « succeeded », « denied » ou « failed » après.
 */
export async function audited(req: NextRequest, meta: AuditMeta, handler: (body: unknown) => Promise<Response>): Promise<Response> {
  const fallback = typeof meta.action === "string" ? meta.action : `${meta.resource.type}.update`;
  const correlation_id = randomUUID();
  const refused = guardWrite(req, { github: meta.github ?? true });
  if (refused) {
    await appendAudit({ action: fallback, level: meta.level, resource: meta.resource, correlation_id, outcome: "denied", reason: null });
    return refused;
  }
  const body = await req.json().catch(() => null);
  const action = typeof meta.action === "string" ? meta.action : meta.action(body);
  const base = { action, level: meta.level, resource: meta.resource, correlation_id };
  const reason = reasonOf(req, body);
  if (!reason) {
    await appendAudit({ ...base, outcome: "denied", reason: null });
    return problem(400, "Motif requis", "Les actions de niveau 2 et 3 exigent un motif de 3 à 500 caractères (champ reason ou en-tête X-Kaiviro-Reason).");
  }
  await appendAudit({ ...base, outcome: "requested", reason });
  let res: Response;
  try {
    res = await handler(body);
  } catch (e) {
    await appendAudit({ ...base, outcome: "failed", reason });
    throw e;
  }
  const outcome: AuditOutcome = res.ok ? "succeeded" : res.status === 403 || res.status === 409 ? "denied" : "failed";
  await appendAudit({ ...base, outcome, reason });
  return res;
}
