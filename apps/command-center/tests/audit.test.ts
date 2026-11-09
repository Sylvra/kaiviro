import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { audited, reasonOf } from "@/lib/api/audit";

let dir = "";
const lines = async () => (await readFile(process.env.AUDIT_FILE!, "utf8").catch(() => "")).trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));

beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "kaiviro-audit-"));
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

const req = (body: unknown, headers: Record<string, string> = {}) =>
  new NextRequest("http://127.0.0.1:3000/api/admin/v1/partners/p1", {
    method: "PATCH",
    headers: { "content-type": "application/json", host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000", ...headers },
    body: JSON.stringify(body),
  });

const meta = { action: "partner.update", level: 2 as const, resource: { type: "partner", id: "p1" }, github: false };

describe("journal d'audit (audit-event.schema.json)", () => {
  it("lit le motif dans l'en-tête ou le corps, et refuse un motif trop court", () => {
    expect(reasonOf(req({}, { "x-kaiviro-reason": encodeURIComponent("Étape → Clos") }), {})).toBe("Étape → Clos");
    expect(reasonOf(req({}), { reason: "  Correction du contact  " })).toBe("Correction du contact");
    expect(reasonOf(req({}), { reason: "ok" })).toBeNull();
  });

  it("refuse sans motif, journalise le refus et n'exécute pas l'action", async () => {
    process.env.AUDIT_FILE = path.join(dir, "a.jsonl");
    const handler = vi.fn(async () => new Response(null, { status: 204 }));
    const res = await audited(req({ stage: "closed" }), meta, handler);
    expect(res.status).toBe(400);
    expect(handler).not.toHaveBeenCalled();
    expect(await lines()).toMatchObject([{ action: "partner.update", level: 2, outcome: "denied", reason: null, actor: { type: "admin", id: "local-admin", role: "owner" } }]);
  });

  it("journalise la demande puis le succès, avec la même corrélation", async () => {
    process.env.AUDIT_FILE = path.join(dir, "b.jsonl");
    const handler = vi.fn(async (body: unknown) => Response.json({ got: body }));
    const res = await audited(req({ stage: "closed", reason: "Fin de la relation" }), meta, handler);
    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledWith({ stage: "closed", reason: "Fin de la relation" });
    const [a, b] = await lines();
    expect(a).toMatchObject({ outcome: "requested", reason: "Fin de la relation", resource: { type: "partner", id: "p1" } });
    expect(b).toMatchObject({ outcome: "succeeded", reason: "Fin de la relation" });
    expect(a.correlation_id).toBe(b.correlation_id);
    expect(a.id).not.toBe(b.id);
    expect(Date.parse(a.at)).not.toBeNaN();
  });

  it("note un refus métier (409) comme denied et une erreur serveur comme failed", async () => {
    process.env.AUDIT_FILE = path.join(dir, "c.jsonl");
    await audited(req({ reason: "Suppression demandée" }), { ...meta, action: "partner.delete", level: 3 }, async () => new Response(null, { status: 409 }));
    await audited(req({ reason: "Import du poste B" }), meta, async () => new Response(null, { status: 502 }));
    expect((await lines()).map((l) => `${l.action}:${l.outcome}`)).toEqual(["partner.delete:requested", "partner.delete:denied", "partner.update:requested", "partner.update:failed"]);
  });

  it("refuse une origine étrangère avant de lire le corps", async () => {
    process.env.AUDIT_FILE = path.join(dir, "d.jsonl");
    const handler = vi.fn(async () => new Response(null, { status: 204 }));
    const res = await audited(req({ reason: "Tentative" }, { origin: "https://exemple.invalid" }), meta, handler);
    expect(res.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
    expect(await lines()).toMatchObject([{ outcome: "denied", reason: null }]);
  });

  it("calcule l'action d'après le corps quand elle dépend de lui", async () => {
    process.env.AUDIT_FILE = path.join(dir, "e.jsonl");
    const actionOf = (b: unknown) => `decision.${(b as { action: string }).action}`;
    await audited(req({ action: "resolve", reason: "Option A retenue" }), { ...meta, action: actionOf, resource: { type: "decision", id: "gh-23" } }, async () => Response.json({ ok: true }));
    expect((await lines()).map((l) => l.action)).toEqual(["decision.resolve", "decision.resolve"]);
  });
});
