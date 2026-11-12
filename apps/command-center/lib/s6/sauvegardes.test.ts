import { describe, expect, it } from "vitest";
import { age, versEtats } from "./sauvegardes";

const M = 1_800_000_000;
const lab = (kind: string, extra: Record<string, string> = {}) => ({ kind, scope: "pi-config", repository: "local", ...extra });
const v = (metric: Record<string, string>, valeur: number) => ({ metric, value: [0, String(valeur)] as [number, string] });

function etats(kind: string, passage: number, succes: number | null, result: string) {
  return versEtats(
    {
      passage: [v(lab(kind), passage)],
      succes: succes === null ? [] : [v(lab(kind), succes)],
      resultat: [v(lab(kind, { result }), 1)],
    },
    M,
  )[0]!;
}

describe("S6 · sauvegardes", () => {
  it("une sauvegarde réussie récente est saine", () => {
    expect(etats("backup", M - 3600, M - 3600, "succeeded")).toMatchObject({ etat: "ok", libelle: "Réussie", perimetre: "pi-config" });
  });

  it("un échec, une absence de succès ou un succès trop ancien sont des alertes", () => {
    expect(etats("backup", M - 60, M - 3600, "failed").etat).toBe("alerte");
    expect(etats("backup", M - 60, null, "partial").libelle).toBe("Jamais réussie");
    expect(etats("backup", M - 60, M - 49 * 3600, "succeeded").etat).toBe("alerte");
  });

  it("le test de restauration a un seuil de 35 jours", () => {
    expect(etats("restore_test", M - 60, M - 30 * 86400, "succeeded")).toMatchObject({ genre: "restore_test", etat: "ok" });
    expect(etats("restore_test", M - 60, M - 36 * 86400, "succeeded").etat).toBe("alerte");
  });

  it("un passage partiel récent demande attention", () => {
    expect(etats("backup", M - 60, M - 60, "partial").etat).toBe("attention");
  });

  it("sans métrique, rien n'est inventé", () => {
    expect(versEtats({ passage: null, succes: null, resultat: null }, M)).toEqual([]);
  });

  it("formate l'âge", () => {
    expect(age(M - 600, M)).toBe("il y a moins d’une heure");
    expect(age(M - 5 * 3600, M)).toBe("il y a 5 h");
    expect(age(M - 3 * 86400, M)).toBe("il y a 3 j");
  });
});
