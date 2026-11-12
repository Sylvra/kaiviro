import { describe, expect, it } from "vitest";
import { etatAdr, lireEntete, versAdr } from "./adr";

const TEXTE = `---
title: "ADR-0099 — Exemple synthétique"
owner: mission-a
status: PROPOSED
version: 0.1
updated: 2026-01-02
---

# ADR-0099 — Exemple synthétique
`;

describe("S2 · registre des ADR", () => {
  it("lit l'en-tête et retire les guillemets", () => {
    expect(lireEntete(TEXTE)).toMatchObject({ title: "ADR-0099 — Exemple synthétique", status: "PROPOSED", updated: "2026-01-02" });
    expect(lireEntete("# sans en-tête")).toEqual({});
  });

  it("construit l'ADR sans répéter son identifiant dans le titre", () => {
    expect(versAdr("docs/adr/ADR-0099-exemple.md", TEXTE, "https://example.test")).toMatchObject({
      id: "ADR-0099",
      titre: "Exemple synthétique",
      statut: "PROPOSED",
      porteur: "mission-a",
    });
  });

  it("un statut absent reste inconnu, jamais accepté", () => {
    expect(versAdr("docs/adr/ADR-0098-x.md", "# rien", "").statut).toBe("INCONNU");
    expect(etatAdr("INCONNU").etat).toBe("inconnu");
    expect(etatAdr("PROPOSED").etat).toBe("attention");
    expect(etatAdr("ACCEPTED").etat).toBe("ok");
  });
});
