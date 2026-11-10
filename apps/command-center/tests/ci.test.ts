import { describe, expect, it } from "vitest";
import { latestByWorkflow, mapRuns, parseAuditLines, runState } from "@/lib/ci";

describe("exécutions GitHub Actions", () => {
  it("traduit statut et conclusion", () => {
    expect(runState("in_progress", null)).toBe("running");
    expect(runState("completed", "success")).toBe("success");
    expect(runState("completed", "timed_out")).toBe("failure");
    expect(runState("completed", "cancelled")).toBe("cancelled");
    expect(runState("completed", "skipped")).toBe("other");
  });
  it("garde la dernière exécution par workflow et branche", () => {
    const runs = mapRuns({ workflow_runs: [
      { id: 3, name: "docs-checks", head_branch: "develop", event: "push", status: "completed", conclusion: "failure", created_at: "2026-11-09T10:00:00Z", html_url: "u3" },
      { id: 2, name: "docs-checks", head_branch: "develop", event: "push", status: "completed", conclusion: "success", created_at: "2026-11-08T10:00:00Z", html_url: "u2" },
      { id: 1, name: "docs-checks", head_branch: "feature/x", event: "pull_request", status: "queued", conclusion: null, created_at: "2026-11-08T09:00:00Z", html_url: "u1" },
    ] });
    expect(latestByWorkflow(runs).map((r) => [r.id, r.state])).toEqual([[3, "failure"], [1, "running"]]);
    expect(mapRuns({ message: "Resource not accessible" })).toEqual([]);
  });
});

describe("journal d'audit", () => {
  it("lit les lignes valides, ignore les autres, plus récentes d'abord", () => {
    const text = [
      JSON.stringify({ id: "a", at: "2026-11-09T10:00:00Z", action: "partner.update", level: 2, resource: { type: "partner", id: "P-001" }, outcome: "succeeded", reason: "relance" }),
      "{pas du json",
      JSON.stringify({ id: "b", at: "2026-11-10T10:00:00Z", action: "partner.delete", level: 3, resource: { type: "partner", id: "P-002" }, outcome: "denied", reason: null }),
      JSON.stringify({ at: "x" }),
      "",
    ].join("\n");
    const r = parseAuditLines(text);
    expect(r.skipped).toBe(2);
    expect(r.lines.map((l) => [l.id, l.resource, l.outcome])).toEqual([["b", "partner:P-002", "denied"], ["a", "partner:P-001", "succeeded"]]);
    expect(parseAuditLines(text, 1).lines).toHaveLength(1);
  });
});
