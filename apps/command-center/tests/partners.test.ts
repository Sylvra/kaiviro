import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PartnerInput, PartnerPatch, addDays, diffEvents, dueState, followUps, nextRef } from "@/lib/partners";
import { addInteraction, createPartner, deletePartner, readPartners, updatePartner } from "@/lib/sources/partners-store";

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

describe("historique", () => {
  const base = { ...PartnerInput.parse({ type: "garage", name: "Garage du Centre" }), id: "x", ref: "G-01", stage: 0 as const, createdAt: "", updatedAt: "" };
  it("note étape, relance et noms des champs modifiés, jamais leurs valeurs", () => {
    const ev = diffEvents(base, { ...base, stage: 1, due: "2026-11-13", contact: "pro@garage.fr", note: "x" });
    expect(ev).toEqual([
      { kind: "stage", text: "À contacter → En discussion" },
      { kind: "due", text: "Relance prévue le 13 novembre" },
      { kind: "edit", text: "Champs modifiés : contact, note" },
    ]);
    expect(JSON.stringify(ev)).not.toContain("pro@garage.fr");
  });
  it("relance reportée puis faite ; rien si rien ne change", () => {
    expect(diffEvents({ ...base, due: "2026-11-06" }, { ...base, due: "2026-11-13" })).toEqual([{ kind: "due", text: "Relance reportée au 13 novembre" }]);
    expect(diffEvents({ ...base, due: "2026-11-06" }, { ...base, due: "" })).toEqual([{ kind: "due", text: "Relance faite" }]);
    expect(diffEvents(base, { ...base })).toEqual([]);
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
    expect(moved?.events?.map((e) => e.kind)).toEqual(["created", "stage", "edit"]);

    const called = await addInteraction(a.id, { kind: "appel", text: "Intéressé, rappeler après M1", date: "2026-11-02" });
    expect(called?.events?.map((e) => e.kind)).toEqual(["appel", "created", "stage", "edit"]); // trié par date
    expect(called?.events?.[0]?.at).toBe("2026-11-02T12:00:00.000Z");
    expect(await addInteraction("inconnu", { kind: "note", text: "x" })).toBeNull();
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
