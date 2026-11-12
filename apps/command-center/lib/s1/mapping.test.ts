import { describe, expect, it } from "vitest";
import { activiteParJour, calculerPlan, chemin, etatCi, jourDuPlan, parMission, versTache, type GhIssue } from "./mapping";

/** Issues synthétiques : mêmes conventions de labels que le dépôt, aucune donnée réelle. */
function issue(n: number, l: string[], over: Partial<GhIssue> = {}): GhIssue {
  return {
    number: n,
    title: `Livrable ${n}`,
    state: "open",
    html_url: `https://example.test/issues/${n}`,
    labels: l.map((name) => ({ name })),
    assignees: [],
    created_at: "2026-01-01T09:00:00Z",
    closed_at: null,
    body: null,
    ...over,
  };
}

const DEBUT = "2026-01-01";
const J4 = new Date("2026-01-04T10:00:00Z");

const issues = [
  issue(1, ["livrable", "mission:a", "jours:1-1"], { state: "closed", closed_at: "2026-01-01T17:00:00Z" }),
  issue(2, ["livrable", "mission:b", "jours:1-2", "status:doing"]),
  issue(3, ["livrable", "mission:commun", "jours:3-4", "status:review"], { state: "closed", closed_at: "2026-01-03T22:30:00Z" }),
  issue(4, ["livrable", "mission:a", "jours:9-10"]),
  issue(5, ["decision", "owner:humains"]),
  issue(6, ["livrable", "mission:a"]),
];

describe("S1 · mapping GitHub", () => {
  it("compte le jour du plan à partir de J1", () => {
    expect(jourDuPlan(DEBUT, new Date("2026-01-01T08:00:00Z"))).toBe(1);
    expect(jourDuPlan(DEBUT, J4)).toBe(4);
  });

  it("convertit un livrable en tâche et ignore le reste", () => {
    const t = versTache(issues[1]!, 4)!;
    expect(t).toMatchObject({ id: "gh-2", statut: "doing", mission: "B", fenetre: "J1–J2", echeanceJours: -2 });
    expect(versTache(issues[4]!, 4)).toBeNull();
    expect(versTache(issues[5]!, 4)).toBeNull();
  });

  it("une issue fermée est terminée, quel que soit son label de statut", () => {
    expect(versTache(issues[2]!, 4)!.statut).toBe("done");
  });

  it("calcule la courbe prévu et terminé", () => {
    const p = calculerPlan(issues, DEBUT, J4);
    expect(p).toMatchObject({ jourCourant: 4, duree: 10, total: 4 });
    expect(p.prevu).toEqual([1, 2, 2, 3, 3, 3, 3, 3, 3, 4]);
    // 22h30 UTC le 3 janvier = 23h30 à Paris, donc J3.
    expect(p.termine).toEqual([1, 1, 2, 2]);
  });

  it("borne le jour courant à la durée du plan", () => {
    expect(calculerPlan(issues, DEBUT, new Date("2026-03-01T10:00:00Z")).jourCourant).toBe(10);
  });

  it("agrège par mission avec les retards", () => {
    const taches = issues.map((i) => versTache(i, 4)).filter((t) => t !== null);
    const [a, b, c] = parMission(taches);
    expect(a).toMatchObject({ termine: 1, afaire: 1, retard: 0 });
    expect(b).toMatchObject({ cours: 1, retard: 1 });
    expect(c).toMatchObject({ termine: 1, retard: 0 });
  });

  it("répartit les événements par jour à Paris", () => {
    const a = activiteParJour(
      [{ type: "PushEvent", created_at: "2026-01-03T23:30:00Z" }, { type: "IssuesEvent", created_at: "2026-01-04T08:00:00Z" }],
      J4,
      3,
    );
    expect(a.jours).toEqual(["02/01", "03/01", "04/01"]);
    expect(a.nombres).toEqual([0, 0, 2]);
  });

  it("lit le chemin déclaré dans le corps", () => {
    expect(chemin("Chemin : `docs/roadmap/X.md`\n\nSource : …")).toBe("docs/roadmap/X.md");
    expect(chemin(null)).toBeUndefined();
  });

  it("n'affiche jamais la CI comme saine sans mesure", () => {
    expect(etatCi(null).etat).toBe("inconnu");
    expect(etatCi([]).etat).toBe("inconnu");
    const run = { head_branch: "feature/x", status: "completed", name: "CI", created_at: "2026-01-04T08:00:00Z" };
    const enCours = { ...run, status: "in_progress", conclusion: null };
    expect(etatCi([enCours]).etat).toBe("inconnu");
    expect(etatCi([enCours, { ...run, conclusion: "failure" }]).libelle).toBe("CI en échec sur feature/x");
    expect(etatCi([{ ...run, conclusion: "success" }, { ...run, conclusion: "failure" }]).etat).toBe("ok");
  });
});
