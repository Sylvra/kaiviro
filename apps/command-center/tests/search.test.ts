import { describe, expect, it } from "vitest";
import { dataItems, githubBlobUrl, normalize, search, staticItems, type SearchItem } from "@/lib/search";
import { ADRS, DECISIONS, DELIVERABLES } from "@/lib/data/plan";

const items: SearchItem[] = [...staticItems(), ...dataItems(DELIVERABLES, DECISIONS, ADRS)];

describe("recherche globale", () => {
  it("ignore accents et majuscules", () => {
    expect(normalize("Équipe  Sécurité")).toBe("equipe securite");
    expect(search(items, "equipe")[0]?.title).toBe("Équipe");
  });
  it("exige tous les mots, dans le titre ou le sous-titre", () => {
    const r = search(items, "contrat supervision");
    expect(r[0]?.title).toBe("Contrat de supervision");
    expect(r.every((i) => normalize(`${i.title} ${i.subtitle}`).includes("supervision"))).toBe(true);
  });
  it("classe d'abord le titre qui commence par la requête", () => {
    const r = search(items, "rapport");
    expect(r.slice(0, 2).every((i) => i.title.startsWith("Rapport"))).toBe(true);
  });
  it("trouve une ADR par son numéro et une décision par sa référence", () => {
    expect(search(items, "adr-0012")[0]?.title).toContain("ADR-0012");
    expect(search(items, "tailscale").some((i) => i.kind === "decision")).toBe(true);
  });
  it("relie une décision à son écran et une ADR à GitHub", () => {
    expect(dataItems([], [{ ...DECISIONS[0]!, key: "gh-23" }], [])[0]?.href).toBe("/crm/decisions?d=gh-23");
    expect(githubBlobUrl("https://raw.githubusercontent.com/Sylvra/kaiviro/develop/docs/adr/ADR-0001-x.md"))
      .toBe("https://github.com/Sylvra/kaiviro/blob/develop/docs/adr/ADR-0001-x.md");
  });
  it("requête vide : aucun résultat", () => {
    expect(search(items, "   ")).toEqual([]);
  });
});
