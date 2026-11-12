import { describe, expect, it } from "vitest";
import { SERIES, duree, etatNoeud, valeur, versSerie, versServices, type Echantillon } from "./mapping";

/** Réponses synthétiques, au format de l'API Prometheus. */
const unite = (name: string, state: string): Echantillon => ({ metric: { name: `${name}.service`, state }, value: [0, "1"] });

describe("S5 · mapping Prometheus", () => {
  it("lit une valeur scalaire et l'arrondit", () => {
    expect(valeur([{ metric: {}, value: [0, "51.8432"] }])).toBe(51.8);
    expect(valeur([])).toBeNull();
    expect(valeur(null)).toBeNull();
    expect(valeur([{ metric: {}, value: [0, "NaN"] }])).toBeNull();
  });

  it("convertit une série sur une heure", () => {
    const s = versSerie(SERIES[0]!, [{ metric: {}, values: [[0, "12.34"], [300, "15"]] }]);
    expect(s).toEqual({ libelle: "CPU", unite: "%", max: 100, valeurs: [12.3, 15] });
    expect(versSerie(SERIES[0]!, null).valeurs).toEqual([]);
  });

  it("une unité absente des mesures reste inconnue", () => {
    const s = versServices([unite("ssh", "active"), unite("valheim", "failed")]);
    expect(s.find((x) => x.nom === "ssh")).toMatchObject({ etat: "ok", libelleEtat: "actif" });
    expect(s.find((x) => x.nom === "valheim")).toMatchObject({ etat: "alerte", libelleEtat: "en échec" });
    expect(s.find((x) => x.nom === "prometheus")).toMatchObject({ etat: "inconnu", libelleEtat: "non mesuré" });
    expect(versServices(null).every((x) => x.etat === "inconnu")).toBe(true);
  });

  it("n'affiche jamais le nœud sain sans mesure complète", () => {
    expect(etatNoeud([], false).etat).toBe("inconnu");
    expect(etatNoeud(versServices(null), true).etat).toBe("inconnu");
    const tous = ["prometheus", "prometheus-node-exporter", "tailscaled", "ssh", "valheim", "valheim-app"];
    expect(etatNoeud(versServices(tous.map((n) => unite(n, "active"))), true).etat).toBe("ok");
    expect(etatNoeud(versServices(tous.map((n, i) => unite(n, i ? "active" : "failed"))), true).etat).toBe("alerte");
  });

  it("formate la durée depuis le démarrage", () => {
    expect(duree(1_278_675)).toBe("14 j 19 h");
    expect(duree(7200)).toBe("2 h");
    expect(duree(null)).toBe("Inconnu");
  });
});
