import { afterEach, describe, expect, it, vi } from "vitest";
import { getAdrs, getDeliverables, getPartners, issueToDeliverable, parseAdrStatus } from "@/lib/queries";
import { DELIVERABLES } from "@/lib/data/plan";

afterEach(() => vi.unstubAllEnvs());

describe("sans GitHub configuré", () => {
  it("les livrables viennent du plan, en fraîcheur « static », jamais « live »", async () => {
    vi.stubEnv("GITHUB_TOKEN", "");
    const d = await getDeliverables();
    expect(d.freshness).toBe("static");
    expect(d.source).toContain("M0_PLAN");
    expect(d.value).toEqual(DELIVERABLES);
  });
  it("les ADR non écrites restent « À rédiger », la 0013 est ouverte", async () => {
    vi.stubEnv("GITHUB_TOKEN", "");
    const a = await getAdrs();
    expect(a.value?.find((x) => x.id === "ADR-0013")?.status).toBe("OPEN");
    expect(a.value?.filter((x) => x.id !== "ADR-0013").every((x) => x.status === "NOT_WRITTEN")).toBe(true);
  });
  it("les partenaires sont marqués démonstration", async () => {
    const p = await getPartners();
    expect(p.demo).toBe(true);
  });
});

describe("conversion GitHub", () => {
  it("lit les labels de la convention", () => {
    const d = issueToDeliverable({
      number: 12, title: "Contrat de supervision", state: "open", html_url: "https://github.com/x/y/issues/12", body: null,
      labels: [{ name: "livrable" }, { name: "mission:a" }, { name: "status:review" }, { name: "type:Contrat" }, { name: "jours:3-4" }],
      assignees: [], milestone: null,
    });
    expect(d).toMatchObject({ id: "gh-12", owner: "A", status: 2, kind: "Contrat", days: [3, 4] });
  });
  it("une issue fermée est terminée", () => {
    const d = issueToDeliverable({ number: 1, title: "x", state: "closed", html_url: "", body: null, labels: [{ name: "status:todo" }], assignees: [], milestone: null });
    expect(d.status).toBe(3);
  });
  it("lit le statut d'une ADR", () => {
    expect(parseAdrStatus("# ADR-0001 — Monorepo\nStatut : ACCEPTED\nDate : 2026-11-10")).toBe("ACCEPTED");
    expect(parseAdrStatus("# ADR\nStatut: proposed")).toBe("PROPOSED");
    expect(parseAdrStatus("pas d'en-tête")).toBe("PROPOSED");
  });
});
