import { describe, expect, it } from "vitest";
import { buildAgency, type AgencyInput } from "@/lib/agency";
import type { Deliverable } from "@/lib/data/plan";
import type { SourceStatus } from "@/lib/sources/types";

const d = (id: string, owner: "C" | "A" | "B", days: [number, number], status: 0 | 1 | 2 | 3): Deliverable => ({ id, owner, title: id, path: "", days, kind: "Doc", status });
const src = (id: string, connected: boolean): SourceStatus => ({ id: id as SourceStatus["id"], name: id, feeds: "", owner: "A", phase: "", configured: connected, connected, reason: null });

const input: AgencyInput = {
  deliverables: [d("a", "A", [1, 2], 3), d("b", "A", [1, 2], 2), d("c", "B", [5, 6], 0)],
  decisions: [{ key: "k", title: "VPN", ref: "X", owner: "A", summary: "", context: "", options: [], resolved: false }],
  adrs: [{ id: "ADR-0001", subject: "", owner: "A", status: "PROPOSED" }, { id: "ADR-0002", subject: "", owner: "B", status: "NOT_WRITTEN" }],
  partners: [{ ref: "G-01", name: "Garage", stage: 1, overdue: true, dueToday: false }],
  branches: [{ branch: "feature/a", exists: true, aheadBy: 22, pull: 2 }, { branch: "feature/b", exists: false, aheadBy: null, pull: null }],
  openPulls: 1,
  planDay: { current: 4, total: 10, over: false, overBy: 0 },
  sources: [src("S1", true), src("S2", true), src("S4", false), src("S5", false), src("S6", false), src("S7", false)],
};

describe("agence 3D", () => {
  it("dérive l'état des zones des données réelles", () => {
    const z = Object.fromEntries(buildAgency(input).zones.map((x) => [x.id, x]));
    expect(z.livrables).toMatchObject({ state: "warn", summary: "1/3 terminés · 1 en retard" }); // « b » en revue, fenêtre J1–J2 passée
    expect(z.decisions?.state).toBe("warn");
    expect(z.partenaires?.state).toBe("alert");
    expect(z.dev?.state).toBe("ok");
    expect(z.knowledge?.summary).toBe("1 ADR écrite(s) sur 2");
  });
  it("sans source, la zone est inconnue, jamais verte", () => {
    const z = Object.fromEntries(buildAgency({ ...input, sources: [], partners: null, planDay: null }).zones.map((x) => [x.id, x]));
    for (const id of ["infra", "ai", "auto", "security", "dev", "knowledge", "partenaires", "overview"]) expect(z[id]?.state).toBe("unknown");
  });
  it("construit tours, piliers, jours et emplacements de supervision", () => {
    const m = buildAgency(input);
    expect(m.towers.find((t) => t.owner === "A")?.blocks.map((b) => b.status)).toEqual([3, 2]);
    expect(m.pillars.map((p) => [p.exists, p.pull])).toEqual([[true, 2], [false, null]]);
    expect(m.days.filter((x) => x.state === "today").map((x) => x.n)).toEqual([4]);
    expect(m.services.every((s) => !s.connected)).toBe(true);
  });
});

describe("agence : données de référence", () => {
  it("ne montre jamais OK sur la foi d'un plan quand GitHub ne répond pas", () => {
    const m = buildAgency({ ...input, deliverablesLive: false, decisionsLive: false });
    const z = Object.fromEntries(m.zones.map((x) => [x.id, x]));
    expect(z.livrables?.state).toBe("unknown");
    expect(z.livrables?.source).toContain("non connecté");
    expect(z.decisions?.state).toBe("unknown");
  });
  it("donne des indicateurs et une répartition qui somment aux livrables réels", () => {
    const m = buildAgency(input);
    const l = m.zones.find((x) => x.id === "livrables")!;
    expect(l.breakdown.reduce((s, x) => s + x.count, 0)).toBe(input.deliverables.length);
    expect(l.kpis[0]?.value).toBe(`${input.deliverables.filter((x) => x.status === 3).length}/${input.deliverables.length}`);
    expect(m.zones.find((x) => x.id === "ai")?.kpis).toEqual([]);
  });
});
