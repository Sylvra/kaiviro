import { describe, expect, it } from "vitest";
import { phaseLabel, planDayAt, todayInParis, workingDaysBetween } from "@/lib/plan-day";
import { MILESTONES } from "@/lib/data/plan";

describe("jour du plan en jours ouvrés", () => {
  it("compte le jour de début et saute le week-end", () => {
    // 2026-11-03 est un mardi.
    expect(workingDaysBetween("2026-11-03", "2026-11-03")).toBe(1);
    expect(workingDaysBetween("2026-11-03", "2026-11-05")).toBe(3);
    expect(workingDaysBetween("2026-11-03", "2026-11-08")).toBe(4); // samedi et dimanche ignorés
    expect(workingDaysBetween("2026-11-03", "2026-11-09")).toBe(5);
    expect(workingDaysBetween("2026-11-03", "2026-11-02")).toBe(0);
  });
  it("borne au dernier jour et signale le dépassement", () => {
    expect(planDayAt("2026-11-03", "2026-11-05", 10)).toEqual({ current: 3, total: 10, start: "2026-11-03", over: false, overBy: 0 });
    expect(planDayAt("2026-11-03", "2026-11-18", 10)).toMatchObject({ current: 10, over: true, overBy: 2 });
    expect(planDayAt("pas une date", "2026-11-05", 10)).toBeNull();
  });
  it("donne la date du jour à Paris, pas en UTC", () => {
    expect(todayInParis(new Date("2026-11-05T23:30:00Z"))).toBe("2026-11-06");
  });
  it("nomme la phase d'après les jalons", () => {
    expect(phaseLabel(planDayAt("2026-11-03", "2026-11-04", 10), MILESTONES)).toBe("Démarrage");
    expect(phaseLabel(planDayAt("2026-11-03", "2026-11-05", 10), MILESTONES)).toBe("Atelier contrats");
    expect(phaseLabel(planDayAt("2026-11-03", "2026-11-30", 10), MILESTONES)).toBe("Plan dépassé");
    expect(phaseLabel(null, MILESTONES)).toBe("Jour inconnu");
  });
});
