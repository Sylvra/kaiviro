import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PartnerInput, PartnerPatch, addDays, dueState, followUps, nextRef } from "@/lib/partners";
import { createPartner, deletePartner, readPartners, updatePartner } from "@/lib/sources/partners-store";

describe("règles des partenaires", () => {
  it("attribue la prochaine référence libre par type", () => {
    expect(nextRef([], "garage")).toBe("G-01");
    expect(nextRef([{ ref: "G-01" }, { ref: "G-07" }, { ref: "O-02" }], "garage")).toBe("G-08");
    expect(nextRef([{ ref: "G-01" }], "beta")).toBe("T-01");
  });
  it("valide la création et complète les champs facultatifs", () => {
    expect(PartnerInput.safeParse({ type: "obd", name: "X" }).success).toBe(false); // nom trop court
    expect(PartnerInput.parse({ type: "obd", name: "Fournisseur A" })).toMatchObject({ stage: 0, owner: "Johan", consent: "À recueillir", role: "", note: "" });
  });
  it("refuse une modification vide et le changement de type", () => {
    expect(PartnerPatch.safeParse({}).success).toBe(false);
    expect(PartnerPatch.parse({ type: "beta", stage: 2 })).toEqual({ stage: 2 });
  });
});

describe("relances", () => {
  const p = (ref: string, due?: string) => ({ ...PartnerInput.parse({ type: "garage", name: `Garage ${ref}` }), id: ref, ref, due, stage: 0 as const, createdAt: "", updatedAt: "" });
  it("situe une relance par rapport à aujourd'hui", () => {
    expect(dueState(undefined, "2026-11-06")).toBe("none");
    expect(dueState("2026-11-05", "2026-11-06")).toBe("overdue");
    expect(dueState("2026-11-06", "2026-11-06")).toBe("today");
    expect(dueState("2026-11-13", "2026-11-06")).toBe("soon");
    expect(dueState("2026-11-14", "2026-11-06")).toBe("later");
    expect(addDays("2026-11-28", 7)).toBe("2026-12-05");
  });
  it("trie retard, aujourd'hui et 7 prochains jours", () => {
    const f = followUps([p("A", "2026-11-10"), p("B", "2026-11-01"), p("C", "2026-11-06"), p("D"), p("E", "2026-12-01"), p("F", "2026-11-04")], "2026-11-06");
    expect(f.overdue.map((x) => x.ref)).toEqual(["B", "F"]);
    expect(f.today.map((x) => x.ref)).toEqual(["C"]);
    expect(f.soon.map((x) => x.ref)).toEqual(["A"]);
  });
  it("refuse une date de relance mal formée", () => {
    expect(PartnerPatch.safeParse({ due: "06/11/2026" }).success).toBe(false);
    expect(PartnerPatch.parse({ due: "" })).toEqual({ due: "" });
  });
});

describe("stockage local", () => {
  let dir = "";
  beforeAll(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "kaiviro-partners-"));
    vi.stubEnv("PARTNERS_FILE", path.join(dir, "data", "partners.json"));
  });
  afterAll(async () => {
    vi.unstubAllEnvs();
    await rm(dir, { recursive: true, force: true });
  });

  it("crée, modifie et supprime dans le fichier", async () => {
    expect(await readPartners()).toEqual({ partners: [], exists: false });
    const a = await createPartner(PartnerInput.parse({ type: "garage", name: "Garage du Centre" }));
    const b = await createPartner(PartnerInput.parse({ type: "garage", name: "Garage du Port" }));
    expect([a.ref, b.ref]).toEqual(["G-01", "G-02"]);

    const moved = await updatePartner(a.id, { stage: 1, next: "Rappeler lundi" });
    expect(moved).toMatchObject({ stage: 1, next: "Rappeler lundi", ref: "G-01" });
    expect(await updatePartner("inconnu", { stage: 2 })).toBeNull();

    expect(await deletePartner(b.id)).toBe(true);
    expect(await deletePartner(b.id)).toBe(false);
    const file = JSON.parse(await readFile(path.join(dir, "data", "partners.json"), "utf8"));
    expect(file.version).toBe(1);
    expect(file.partners.map((p: { ref: string }) => p.ref)).toEqual(["G-01"]);
  });

  it("deux créations simultanées ne se perdent pas", async () => {
    await Promise.all([1, 2, 3].map((n) => createPartner(PartnerInput.parse({ type: "beta", name: `Testeur ${n}` }))));
    const refs = (await readPartners()).partners.filter((p) => p.type === "beta").map((p) => p.ref).sort();
    expect(refs).toEqual(["T-01", "T-02", "T-03"]);
  });
});
