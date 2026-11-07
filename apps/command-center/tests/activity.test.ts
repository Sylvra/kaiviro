import { describe, expect, it } from "vitest";
import { mapRepoEvent, mergeLog, type GhRepoEvent } from "@/lib/activity";

const ev = (type: string, payload: GhRepoEvent["payload"], at = "2026-11-06T15:00:00Z"): GhRepoEvent =>
  ({ id: type + at, type, created_at: at, actor: { login: "Sylvra" }, payload });

describe("journal d'activité", () => {
  it("traduit les événements GitHub utiles", () => {
    expect(mapRepoEvent(ev("PushEvent", { ref: "refs/heads/feature/x", size: 2, commits: [{ message: "a" }, { message: "feat: b\n\ncorps" }] }))?.text)
      .toBe("2 commits sur feature/x · feat: b");
    expect(mapRepoEvent(ev("PullRequestEvent", { action: "closed", pull_request: { number: 2, title: "Mission A", html_url: "u", merged: true } }))?.text)
      .toBe("PR #2 fusionnée · Mission A");
    expect(mapRepoEvent(ev("IssuesEvent", { action: "closed", issue: { number: 9, title: "Archi", html_url: "u" } }))).toMatchObject({ kind: "Issue", text: "#9 fermée · Archi", url: "u" });
    expect(mapRepoEvent(ev("CreateEvent", { ref_type: "branch", ref: "feature/y" }))?.text).toBe("Branche créée · feature/y");
  });
  it("ignore ce qui n'aide pas à piloter", () => {
    expect(mapRepoEvent(ev("WatchEvent", {}))).toBeNull();
    expect(mapRepoEvent(ev("IssuesEvent", { action: "labeled", issue: { number: 1, title: "x", html_url: "" } }))).toBeNull();
    expect(mapRepoEvent(ev("CreateEvent", { ref_type: "tag", ref: "v1" }))).toBeNull();
  });
  it("fusionne les sources du plus récent au plus ancien", () => {
    const a = { id: "a", at: "2026-11-05T10:00:00Z", source: "GitHub" as const, kind: "Push", actor: "x", text: "" };
    const b = { ...a, id: "b", at: "2026-11-06T09:00:00Z", source: "Partenaires" as const };
    expect(mergeLog([[a], [b]]).map((e) => e.id)).toEqual(["b", "a"]);
    expect(mergeLog([[a, b]], 1)).toHaveLength(1);
  });
});
