import { describe, expect, it } from "vitest";
import { lireCorps, trierDecisions, versDecision } from "./decisions";
import type { GhIssue } from "./mapping";

/** Issue synthétique, mêmes conventions que le dépôt. */
const issue = (n: number, labels: string[], over: Partial<GhIssue> = {}): GhIssue => ({
  number: n,
  title: `Décision ${n}`,
  state: "open",
  html_url: `https://example.test/issues/${n}`,
  labels: labels.map((name) => ({ name })),
  assignees: [],
  created_at: "2026-01-01T09:00:00Z",
  closed_at: null,
  body: null,
  ...over,
});

const CORPS = "Quelle base ?\n\nIl faut PostgreSQL.\n\n## Options\n- Option A\n- Option B, avec virgule\n";

describe("S1 · décisions", () => {
  it("découpe question, contexte et options", () => {
    expect(lireCorps(CORPS)).toEqual({ question: "Quelle base ?", contexte: "Il faut PostgreSQL.", options: ["Option A", "Option B, avec virgule"] });
    expect(lireCorps(null)).toEqual({ options: [] });
    expect(lireCorps("Juste une ligne").options).toEqual([]);
  });

  it("lit porteur et référence dans les labels", () => {
    const d = versDecision(issue(26, ["decision", "owner:b", "ref:ADR-0004"], { body: CORPS }))!;
    expect(d).toMatchObject({ id: "gh-26", porteur: "Mission B", reference: "ADR-0004", tranchee: false });
    expect(versDecision(issue(1, ["livrable"]))).toBeNull();
    expect(versDecision(issue(2, ["decision"]))!.porteur).toBe("Inconnu");
  });

  it("une issue fermée est tranchée, et passe après les ouvertes", () => {
    const fermee = versDecision(issue(30, ["decision"], { state: "closed", closed_at: "2026-01-02T10:00:00Z" }))!;
    const ouverte = versDecision(issue(20, ["decision"]))!;
    expect(fermee.tranchee).toBe(true);
    expect(trierDecisions([fermee, ouverte]).map((d) => d.numero)).toEqual([20, 30]);
  });
});
