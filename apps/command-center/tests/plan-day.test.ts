import { describe, expect, it } from "vitest";
import { easterSunday, frenchHolidays, isHoliday, phaseLabel, planDayAt, todayInParis, workingDaysBetween } from "@/lib/plan-day";
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
    // Avec le 11 novembre férié : J10 tombe le 17, le 18 est J11.
    expect(planDayAt("2026-11-03", "2026-11-18", 10)).toMatchObject({ current: 10, over: true, overBy: 1 });
    expect(planDayAt("pas une date", "2026-11-05", 10)).toBeNull();
  });
  it("calcule Pâques et les jours fériés mobiles", () => {
    expect(easterSunday(2024)).toBe("2024-03-31");
    expect(easterSunday(2025)).toBe("2025-04-20");
    expect(easterSunday(2026)).toBe("2026-04-05");
    const h = frenchHolidays(2026);
    expect(h.size).toBe(11);
    expect([...h].filter((d) => ["2026-04-06", "2026-05-14", "2026-05-25", "2026-11-11"].includes(d))).toHaveLength(4);
  });
  it("saute les jours fériés : le 11 novembre ne compte pas", () => {
    // Mardi 3 → mardi 10 = 6 jours ouvrés ; mercredi 11 férié ; jeudi 12 = J7.
    expect(workingDaysBetween("2026-11-03", "2026-11-10")).toBe(6);
    expect(workingDaysBetween("2026-11-03", "2026-11-11")).toBe(6);
    expect(workingDaysBetween("2026-11-03", "2026-11-12")).toBe(7);
    expect(isHoliday("2026-11-11")).toBe(true);
    expect(isHoliday("2026-11-12")).toBe(false);
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
