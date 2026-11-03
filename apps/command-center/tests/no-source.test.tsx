import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SourceNote, UnknownTile } from "@/components/ui";
import { HEALTH_CHECKS, PI_GAUGES } from "@/lib/data/ops";
import { unknown } from "@/lib/sources/types";

/** Règle CRM_SPEC §1 : aucune valeur sans provenance, aucune inconnue présentée comme saine. */
describe("aucune valeur sans source", () => {
  it("une tuile inconnue affiche —, « Inconnu » et sa source", () => {
    const { container, getByText, getByLabelText } = render(<UnknownTile label="CPU" source="S5 · Node Exporter" />);
    expect(getByLabelText("valeur inconnue").textContent).toBe("—");
    expect(getByText("Inconnu")).toBeTruthy();
    expect(container.querySelector("[data-source]")?.getAttribute("data-source")).toBe("S5 · Node Exporter");
    expect(container.textContent).toContain("jamais mesuré");
  });
  it("SourceNote annonce « jamais mesuré » pour une source non branchée", () => {
    const { container } = render(<SourceNote s={unknown("S4")} />);
    expect(container.textContent).toContain("jamais mesuré");
  });
  it("chaque indicateur de santé du référentiel déclare sa source", () => {
    for (const h of HEALTH_CHECKS) expect(h.source.trim().length).toBeGreaterThan(0);
    expect(PI_GAUGES.length).toBe(4);
  });
});
