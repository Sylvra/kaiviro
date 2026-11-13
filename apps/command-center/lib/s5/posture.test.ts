import { describe, expect, it } from "vitest";
import { versControles, type REQUETES_POSTURE } from "./posture";
import type { Echantillon } from "./mapping";

const M = 1_800_000_000;
const v = (valeur: number, metric: Record<string, string> = {}): Echantillon => ({ metric, value: [0, String(valeur)] });
type R = Record<keyof typeof REQUETES_POSTURE, Echantillon[] | null>;

function base(over: Partial<R> = {}): R {
  return {
    motDePasse: [v(0)],
    interactif: [v(0)],
    root: [v(1, { mode: "no" })],
    exposes: [],
    regles: [v(12)],
    politiqueDrop: [v(1)],
    majAuto: [v(1)],
    releve: [v(M - 600)],
    majSecurite: [v(0)],
    ...over,
  };
}
const controle = (r: R, id: string) => versControles(r, M).find((c) => c.id === id)!;

describe("S5 · posture de sécurité", () => {
  it("une Pi conforme est saine partout", () => {
    expect(versControles(base(), M).every((c) => c.etat === "ok")).toBe(true);
  });

  it("les mots de passe SSH sont une alerte", () => {
    expect(controle(base({ motDePasse: [v(1)] }), "ssh-auth").etat).toBe("alerte");
    expect(controle(base({ interactif: [v(1)] }), "ssh-auth").etat).toBe("alerte");
  });

  it("root par clé demande attention, root ouvert est une alerte", () => {
    expect(controle(base({ root: [v(1, { mode: "prohibit-password" })] }), "ssh-root").etat).toBe("attention");
    expect(controle(base({ root: [v(1, { mode: "yes" })] }), "ssh-root").etat).toBe("alerte");
  });

  it("liste les ports visibles hors tailnet", () => {
    const c = controle(base({ exposes: [v(1, { port: "22", process: "sshd" })] }), "ports");
    expect(c.etat).toBe("attention");
    expect(c.constat).toContain("22 (sshd)");
    expect(c.constat).toContain("filtrée par nftables");
    expect(controle(base({ exposes: [v(1, { port: "22" })], politiqueDrop: [v(0)] }), "ports").constat).toContain("Aucun filtrage");
  });

  it("sans relevé frais, rien n'est déclaré sain, sauf ce qui vient d'ailleurs", () => {
    const r = versControles(base({ releve: [v(M - 3 * 3600)] }), M);
    expect(r.find((c) => c.id === "releve")!.etat).toBe("alerte");
    expect(r.filter((c) => !["releve", "maj-securite"].includes(c.id)).every((c) => c.etat === "inconnu")).toBe(true);
    expect(versControles(base({ releve: null }), M)[0]!.etat).toBe("inconnu");
  });

  it("compte les mises à jour de sécurité en attente", () => {
    expect(controle(base({ majSecurite: [v(22)] }), "maj-securite")).toMatchObject({ etat: "attention", constat: "22 paquets en attente" });
  });
});
