import { describe, expect, it } from "vitest";
import { countByStatus, planSlice } from "@/lib/overview";
import type { Deliverable } from "@/lib/data/plan";

const d = (id: string, days: [number, number], status: 0 | 1 | 2 | 3): Deliverable =>
  ({ id, owner: "A", title: id, path: "", days, kind: "Doc", status });

const items = [
  d("fini", [1, 1], 3),
  d("retard", [1, 2], 2),
  d("jour", [3, 4], 1),
  d("demain", [5, 6], 0),
  d("plus-tard", [7, 8], 0),
];

describe("vue d'ensemble du plan", () => {
  it("sépare aujourd'hui, retard et prochain départ au J3", () => {
    const s = planSlice(items, 3);
    expect(s.today.map((x) => x.id)).toEqual(["jour"]);
    expect(s.late.map((x) => x.id)).toEqual(["retard"]); // en revue mais fenêtre passée
    expect(s.next.map((x) => x.id)).toEqual(["demain"]);
  });
  it("trouve le jalon en cours ou à venir", () => {
    expect(planSlice(items, 3).milestone).toMatchObject({ label: "Atelier contrats", inDays: 0 });
    expect(planSlice(items, 7).milestone).toMatchObject({ label: "Recette · tag m0.1.0", inDays: 3 });
  });
  it("jour inconnu : rien n'est déduit", () => {
    expect(planSlice(items, null)).toEqual({ today: [], late: [], next: [], milestone: null });
  });
  it("compte les livrables par statut", () => {
    expect(countByStatus(items)).toEqual([2, 1, 1, 1]);
  });
});
