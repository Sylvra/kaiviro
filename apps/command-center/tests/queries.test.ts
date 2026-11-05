import { afterEach, describe, expect, it, vi } from "vitest";
import { getAdrs, getDeliverables, getPartners, issueToDeliverable, parseAdrStatus, splitDecisionBody, statusPatch, newDeliverableIssue, decisionComment } from "@/lib/queries";
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
  it("lit le chemin dans le corps de l'issue", () => {
    const d = issueToDeliverable({ number: 9, title: "x", state: "open", html_url: "", body: "Chemin : `docs/architecture/ADMIN_ARCHITECTURE.md`\n\nSource : plan", labels: [], assignees: [], milestone: null });
    expect(d.path).toBe("docs/architecture/ADMIN_ARCHITECTURE.md");
  });
  it("sépare résumé, contexte et options d'une décision", () => {
    const s = splitDecisionBody("Quels modules ?\n\nLe CRM est réservé aux admins.\n\n## Options\n- Partenaires\n- Pilotage\n");
    expect(s).toEqual({ summary: "Quels modules ?", context: "Le CRM est réservé aux admins.", options: ["Partenaires", "Pilotage"] });
  });
  it("change de statut : un seul label status:*, fermée si Terminé", () => {
    expect(statusPatch(["livrable", "mission:a", "status:todo"], 2)).toEqual({ labels: ["livrable", "mission:a", "status:review"], state: "open" });
    expect(statusPatch(["livrable", "status:review"], 3)).toEqual({ labels: ["livrable", "status:done"], state: "closed" });
    expect(statusPatch(["livrable", "status:done"], 0).state).toBe("open");
  });
  it("construit l'issue d'un nouveau livrable selon la convention", () => {
    expect(newDeliverableIssue({ title: "VPN", mission: "a", kind: "Infra", days: [7, 8], path: "docs/`x`.md" })).toEqual({
      title: "VPN",
      body: "Chemin : `docs/x.md`\n\nCréé depuis le Command Center.",
      labels: ["livrable", "mission:a", "status:todo", "type:Infra", "jours:7-8"],
    });
  });
  it("écrit le commentaire d'une décision tranchée", () => {
    expect(decisionComment("resolve", "Tailscale", "Plus simple sur mobile")).toBe("**Tranchée : Tailscale**\n\nPlus simple sur mobile\n\nL’ADR liée est à mettre à jour dans une PR.");
    expect(decisionComment("comment")).toBeNull();
    expect(decisionComment("reopen")).toBe("Rouverte depuis le Command Center.");
  });
  it("lit le statut d'une ADR", () => {
    expect(parseAdrStatus("# ADR-0001 — Monorepo\nStatut : ACCEPTED\nDate : 2026-11-10")).toBe("ACCEPTED");
    expect(parseAdrStatus("# ADR\nStatut: proposed")).toBe("PROPOSED");
    expect(parseAdrStatus("pas d'en-tête")).toBe("PROPOSED");
  });
});
