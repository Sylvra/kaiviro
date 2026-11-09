import { describe, expect, it } from "vitest";
import { STATUS_API, deliverableFromApi, deliverableToApi, envelope, sourceCode, statusFromApi, statusToApi, unknownReasonOf } from "@/lib/contract";
import { PartnerPatch, partnerBodyFromApi, partnerBodyToApi, partnerFromApi, partnerToApi, retentionAlerts, type Partner } from "@/lib/partners";
import type { Deliverable } from "@/lib/data/plan";

describe("enveloppe de provenance (freshness.schema.json)", () => {
  it("extrait le code S1…S9, sinon une référence", () => {
    expect(sourceCode("S5 · Prometheus · Node Exporter")).toBe("S5");
    expect(sourceCode("S1")).toBe("S1");
    expect(sourceCode("docs/roadmap/M0_PLAN.md §5")).toBe("ref:docs/roadmap/M0_PLAN.md §5");
    expect(sourceCode("S10 inconnu")).toBe("ref:S10 inconnu");
  });
  it("donne une raison à toute donnée inconnue, et aucune sinon", () => {
    expect(unknownReasonOf({ freshness: "unknown", source: "S5 · Prometheus (PROMETHEUS_URL absent)" })).toBe("source_disconnected");
    expect(unknownReasonOf({ freshness: "unknown", source: "S4 · Uptime Kuma (injoignable)" })).toBe("source_error");
    expect(unknownReasonOf({ freshness: "unknown", source: "S9" })).toBe("never_measured");
    expect(unknownReasonOf({ freshness: "unknown", source: "S5 (absent)", unknownReason: "not_collected" })).toBe("not_collected");
    expect(unknownReasonOf({ freshness: "live", source: "S1" })).toBeNull();
  });
  it("produit les champs du schéma", () => {
    const e = envelope({ value: null, source: "S6 · journal (BACKUP_STATUS_URL absent)", fetchedAt: null, freshness: "unknown", demo: false });
    expect(e).toEqual({ data: null, source: "S6", source_label: "S6 · journal (BACKUP_STATUS_URL absent)", fetched_at: null, freshness: "unknown", demo: false, unknown_reason: "source_disconnected" });
  });
});

describe("livrables (OpenAPI, schéma Deliverable)", () => {
  const d: Deliverable = { id: "gh-12", owner: "A", title: "ADR-0012", path: "docs/adr/ADR-0012.md", days: [5, 6], kind: "ADR", status: 2, url: "https://github.com/Sylvra/kaiviro/issues/12" };
  it("convertit les statuts dans les deux sens", () => {
    expect(STATUS_API.map((s) => statusToApi(statusFromApi(s)))).toEqual([...STATUS_API]);
    expect(statusToApi(1)).toBe("in_progress");
  });
  it("expose les noms du contrat et revient au modèle interne sans perte", () => {
    const api = deliverableToApi(d);
    expect(api).toMatchObject({ mission: "a", type: "ADR", status: "in_review", due_on: null, assignee: null });
    expect(deliverableFromApi(api)).toEqual(d);
  });
});

describe("partenaires (OpenAPI, schéma Partner)", () => {
  const p: Partner = {
    id: "p1", ref: "T-01", type: "beta", name: "Testeur Un", role: "Particulier", contact: "pro@example.invalid", stage: 4,
    next: "Rappeler", due: "2026-12-01", owner: "Johan", gear: "Adaptateur prêté", consent: "Retiré", note: "",
    createdAt: "2026-11-01T10:00:00.000Z", updatedAt: "2026-11-02T10:00:00.000Z", events: [],
  };
  it("expose les valeurs du contrat et revient au modèle interne sans perte", () => {
    const api = partnerToApi(p);
    expect(api).toMatchObject({ type: "beta_tester", stage: "closed", consent_status: "withdrawn", next_action: "Rappeler", due_on: "2026-12-01", equipment: "Adaptateur prêté", owner_admin_id: null });
    expect(partnerFromApi(api)).toEqual(p);
  });
  it("convertit un corps de requête du contrat et ignore les clés hors fiche", () => {
    expect(partnerBodyFromApi({ stage: "closed", type: "obd_supplier", consent_status: "granted", due_on: null, reason: "motif" }))
      .toEqual({ stage: 4, type: "obd", consent: "Recueilli", due: "" });
    expect(PartnerPatch.safeParse(partnerBodyFromApi({ stage: "inconnue" })).success).toBe(false);
  });
  it("convertit le corps envoyé par le navigateur en gardant motif et confirmation", () => {
    expect(partnerBodyToApi({ stage: 1, next: "Appeler", due: "", gear: "", reason: "Étape → En discussion" }))
      .toEqual({ stage: "in_discussion", next_action: "Appeler", due_on: null, equipment: "", reason: "Étape → En discussion" });
  });
});

describe("conservation (CRM_SPEC §5.8, durées proposées)", () => {
  const base = { role: "", contact: "", next: "", owner: "Johan" as const, gear: "", note: "", events: [] };
  const mk = (o: Partial<Partner> & Pick<Partner, "id" | "type" | "stage" | "consent" | "createdAt" | "updatedAt">): Partner => ({ ref: o.id, name: o.id, ...base, ...o });
  const today = "2026-11-09";

  it("signale une relation close depuis plus de 3 ans", () => {
    const closed = mk({ id: "G-01", type: "garage", stage: 4, consent: "Non requis", createdAt: "2023-01-01T00:00:00Z", updatedAt: "2023-06-01T00:00:00Z",
      events: [{ id: "e", at: "2023-06-01T00:00:00Z", kind: "stage", text: "En pause → Clos" }] });
    expect(retentionAlerts([closed], today)).toMatchObject([{ ref: "G-01", due: "2026-06-01", overdue: true }]);
  });
  it("signale un consentement non recueilli à l'approche des 30 jours, pas avant", () => {
    const old = mk({ id: "T-01", type: "beta", stage: 1, consent: "À recueillir", createdAt: "2026-10-20T00:00:00Z", updatedAt: "2026-10-20T00:00:00Z" });
    const recent = mk({ id: "T-02", type: "beta", stage: 0, consent: "À recueillir", createdAt: "2026-11-08T00:00:00Z", updatedAt: "2026-11-08T00:00:00Z" });
    expect(retentionAlerts([old, recent], today)).toMatchObject([{ ref: "T-01", due: "2026-11-19", overdue: false }]);
  });
  it("ne signale ni un partenaire actif ni un consentement recueilli", () => {
    const ok = mk({ id: "T-03", type: "beta", stage: 2, consent: "Recueilli", createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-01T00:00:00Z" });
    expect(retentionAlerts([ok], today)).toEqual([]);
  });
});
