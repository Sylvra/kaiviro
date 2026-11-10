import { describe, expect, it } from "vitest";
import { aire, echelle, graduations, indexProche, points, polyligne, type Cadre } from "./charts";

const cadre: Cadre = { largeur: 100, hauteur: 50, gauche: 0, droite: 0, haut: 0, bas: 0 };

describe("charts", () => {
  it("échelle linéaire", () => {
    const s = echelle(0, 10, 0, 100);
    expect(s(0)).toBe(0);
    expect(s(5)).toBe(50);
    expect(s(10)).toBe(100);
  });

  it("échelle dégénérée ne divise pas par zéro", () => {
    expect(Number.isFinite(echelle(3, 3, 0, 10)(3))).toBe(true);
  });

  it("points : 0 en bas, max en haut, réparti sur la largeur", () => {
    expect(points([0, 10], cadre, 10)).toEqual([
      [0, 50],
      [100, 0],
    ]);
  });

  it("points sur un horizon plus long que la série", () => {
    const pts = points([0, 5], cadre, 10, 3);
    expect(pts[1]).toEqual([50, 25]);
  });

  it("polyligne et aire fermée", () => {
    const pts: [number, number][] = [
      [0, 10],
      [50, 5],
    ];
    expect(polyligne(pts)).toBe("0,10 50,5");
    expect(aire(pts, 50)).toBe("M0 50 L0 10 L50 5 L50 50 Z");
    expect(aire([], 50)).toBe("");
  });

  it("index le plus proche, borné", () => {
    expect(indexProche(-20, cadre, 5)).toBe(0);
    expect(indexProche(26, cadre, 5)).toBe(1);
    expect(indexProche(999, cadre, 5)).toBe(4);
    expect(indexProche(10, cadre, 1)).toBe(0);
  });

  it("graduations", () => {
    expect(graduations(20, 4)).toEqual([0, 5, 10, 15, 20]);
  });
});
