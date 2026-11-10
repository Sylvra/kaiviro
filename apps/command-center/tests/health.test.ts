import { describe, expect, it } from "vitest";
import { healthTiles, type HealthInput } from "@/lib/health";

const none = <T,>(source: string) => ({ value: null as T | null, source, freshness: "unknown" });

describe("tuiles de santé", () => {
  it("tout est inconnu sans source", () => {
    const tiles = healthTiles({ host: none("S5"), services: none("S5"), monitors: none("S4"), app: none("S7"), backup: none("S6"), ci: none("S1") });
    expect(tiles.every((t) => t.state === "unknown" && t.value === "—" && !t.live)).toBe(true);
  });
  it("lit les vraies mesures ; moniteur introuvable = inconnu", () => {
    const d: HealthInput = {
      host: { value: { cpu: 0.2, mem: 0.3, disk: 0.85, memTotal: null, temp: 51, load1: null, uptime: null, netRx: null, netTx: null, series: { cpu: [], mem: [], temp: [] } }, source: "S5", freshness: "live" },
      services: { value: [{ name: "valheim", state: "active" }, { name: "ssh", state: "failed" }], source: "S5", freshness: "live" },
      monitors: { value: [{ name: "Tailscale", up: false, uptime24: null, ping: null }], source: "S4", freshness: "live" },
      app: { value: { service: "backend", status: "ok", checkedAt: null, version: null, dependencies: [{ name: "database", status: "down", checkedAt: null, latencyMs: null }] }, source: "S7", freshness: "live" },
      backup: none("S6"),
      ci: { value: [{ id: 1, workflow: "w", branch: "develop", event: "push", state: "success", startedAt: "", url: "" }], source: "S1", freshness: "live" },
    };
    const t = Object.fromEntries(healthTiles(d).map((x) => [x.label, [x.state, x.value]]));
    expect(t["API applicative"]).toEqual(["ok", "OK"]);
    expect(t["Base de données"]).toEqual(["alert", "down"]);
    expect(t["Command Center"]).toEqual(["unknown", "—"]);
    expect(t["VPN admin"]).toEqual(["alert", "hors ligne"]);
    expect(t["Raspberry Pi"]).toEqual(["warn", "CPU 20 % · 51 °C"]);
    expect(t["Stockage"]).toEqual(["warn", "85 % utilisé"]);
    expect(t["Services Pi"]).toEqual(["alert", "1/2 actifs"]);
    expect(t["CI"]).toEqual(["ok", "verte"]);
    expect(t["Dernière sauvegarde"]).toEqual(["unknown", "—"]);
  });
});
