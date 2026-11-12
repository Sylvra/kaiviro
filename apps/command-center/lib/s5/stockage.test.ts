import { describe, expect, it } from "vitest";
import { disqueParent, versDisques } from "./stockage";

const v = (metric: Record<string, string>, valeur: string) => ({ metric, value: [0, valeur] as [number, string] });

describe("S5 · stockage", () => {
  it("retrouve le disque d'une partition", () => {
    expect(disqueParent("/dev/sda1")).toBe("/dev/sda");
    expect(disqueParent("/dev/mmcblk0p2")).toBe("/dev/mmcblk0");
    expect(disqueParent("/dev/nvme0n1p1")).toBe("/dev/nvme0n1");
  });

  it("combine taille, occupation et SMART ; une carte SD reste sans santé", () => {
    const d = versDisques({
      taille: [v({ device: "/dev/sda1", mountpoint: "/srv" }, "500000000000"), v({ device: "/dev/mmcblk0p2", mountpoint: "/" }, "60000000000")],
      libre: [v({ mountpoint: "/srv" }, "490000000000"), v({ mountpoint: "/" }, "51000000000")],
      modele: [v({ disk: "/dev/sda", device_model: "SSD synthétique" }, "1")],
      sain: [v({ disk: "/dev/sda" }, "1")],
      heures: [v({ disk: "/dev/sda" }, "900")],
      temperature: [v({ disk: "/dev/sda" }, "25")],
      majEnAttente: null,
      redemarrage: null,
    });
    expect(d.map((x) => x.point)).toEqual(["/", "/srv"]);
    expect(d[0]).toMatchObject({ support: "Carte SD", tailleGo: 60, occupePct: 15, sante: { etat: "inconnu" } });
    expect(d[1]).toMatchObject({ support: "SSD synthétique", tailleGo: 500, occupePct: 2, heures: 900, temperature: 25, sante: { etat: "ok" } });
  });

  it("un SMART en échec est une alerte", () => {
    const d = versDisques({
      taille: [v({ device: "/dev/sda1", mountpoint: "/srv" }, "100")],
      libre: [],
      modele: null,
      sain: [v({ disk: "/dev/sda" }, "0")],
      heures: null,
      temperature: null,
      majEnAttente: null,
      redemarrage: null,
    });
    expect(d[0]!.sante.etat).toBe("alerte");
    expect(Number.isNaN(d[0]!.occupePct)).toBe(true);
  });
});
