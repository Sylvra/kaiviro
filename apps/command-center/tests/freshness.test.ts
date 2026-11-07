import { describe, expect, it } from "vitest";
import { ageLabel, computeFreshness, isTrustworthy } from "@/lib/sources/freshness";
import { fromDemo, fromStatic, unknown } from "@/lib/sources/types";

const now = new Date("2026-11-03T15:00:00Z");

describe("computeFreshness", () => {
  it("n'invente jamais une fraîcheur sans horodatage", () => {
    expect(computeFreshness(null, 60_000, now)).toBe("unknown");
    expect(computeFreshness("pas une date", 60_000, now)).toBe("unknown");
  });
  it("distingue live et stale", () => {
    expect(computeFreshness("2026-11-03T14:59:30Z", 60_000, now)).toBe("live");
    expect(computeFreshness("2026-11-03T14:50:00Z", 60_000, now)).toBe("stale");
  });
  it("refuse une mesure venant du futur", () => {
    expect(computeFreshness("2026-11-03T16:00:00Z", 60_000, now)).toBe("unknown");
  });
});

describe("ageLabel", () => {
  it("dit « jamais mesuré » sans horodatage", () => expect(ageLabel(null, now)).toBe("jamais mesuré"));
  it("formate en minutes", () => expect(ageLabel("2026-11-03T14:55:00Z", now)).toBe("il y a 5 min"));
});

describe("isTrustworthy", () => {
  it("seule une mesure live, non démo, sourcée est digne de confiance", () => {
    expect(isTrustworthy(unknown("S5"))).toBe(false);
    expect(isTrustworthy(fromStatic(1, "plan"))).toBe(false);
    expect(isTrustworthy(fromDemo(1, "S8"))).toBe(false);
    expect(isTrustworthy({ value: 1, source: "S5", fetchedAt: now.toISOString(), freshness: "live", demo: false })).toBe(true);
    expect(isTrustworthy({ value: 1, source: "", fetchedAt: now.toISOString(), freshness: "live", demo: false })).toBe(false);
  });
});
