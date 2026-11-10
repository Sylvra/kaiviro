import { describe, expect, it } from "vitest";
import { appHealthState, fmtBytes, fmtDuration, hostHealth, mergeContainers, parseHealth, parseKuma, parseMatrix, parseUnits, parseVector, unitsQuery, type PiHost } from "@/lib/infra";

const vec = (rows: [Record<string, string>, string][]) => ({ status: "success", data: { resultType: "vector", result: rows.map(([metric, v]) => ({ metric, value: [1, v] })) } });

describe("supervision de la Pi", () => {
  it("lit les vecteurs Prometheus et ignore les valeurs non numériques", () => {
    expect(parseVector(vec([[{}, "0.23"], [{ x: "1" }, "NaN"]]))).toEqual([{ labels: {}, value: 0.23 }]);
    expect(parseVector({ status: "error" })).toEqual([]);
    expect(parseVector(null)).toEqual([]);
  });
  it("lit une série temporelle pour les courbes", () => {
    const m = { status: "success", data: { resultType: "matrix", result: [{ metric: {}, values: [[1, "0.2"], [2, "0.3"]] }] } };
    expect(parseMatrix(m)).toEqual([[1, 0.2], [2, 0.3]]);
    expect(parseMatrix(vec([]))).toEqual([]);
  });
  it("fusionne les conteneurs cAdvisor ; arrêté si non vu depuis 2 min", () => {
    const c = mergeContainers(
      parseVector(vec([[{ name: "prometheus" }, "0.05"], [{ name: "grafana" }, "0.01"]])),
      parseVector(vec([[{ name: "prometheus" }, "104857600"]])),
      parseVector(vec([[{ name: "prometheus" }, "10"], [{ name: "grafana" }, "600"]])),
    );
    expect(c).toEqual([
      { name: "grafana", cpu: 0.01, mem: null, lastSeen: 600, up: false },
      { name: "prometheus", cpu: 0.05, mem: 104857600, lastSeen: 10, up: true },
    ]);
  });
  it("lit la page de statut Uptime Kuma", () => {
    const page = { publicGroupList: [{ monitorList: [{ id: 1, name: "API" }, { id: 2, name: "Grafana" }] }] };
    const beats = { heartbeatList: { "1": [{ status: 0, ping: null }, { status: 1, ping: 42 }] }, uptimeList: { "1_24": 0.998 } };
    expect(parseKuma(page, beats)).toEqual([
      { name: "API", up: true, uptime24: 0.998, ping: 42 },
      { name: "Grafana", up: null, uptime24: null, ping: null },
    ]);
  });
  it("juge la santé de l'hôte, inconnue sans mesure", () => {
    const base: PiHost = { cpu: 0.2, mem: 0.4, disk: 0.5, memTotal: null, temp: 50, load1: null, uptime: null, netRx: null, netTx: null, series: { cpu: [], mem: [], temp: [] } };
    expect(hostHealth(null)).toBe("unknown");
    expect(hostHealth({ ...base, cpu: null })).toBe("unknown");
    expect(hostHealth(base)).toBe("ok");
    expect(hostHealth({ ...base, temp: 72 })).toBe("warn");
    expect(hostHealth({ ...base, disk: 0.95 })).toBe("alert");
  });
  it("lit l'état des services systemd, inconnu sans état actif à 1", () => {
    const rows = parseVector(vec([
      [{ name: "valheim.service", state: "active" }, "1"], [{ name: "valheim.service", state: "failed" }, "0"],
      [{ name: "ssh.service", state: "failed" }, "1"], [{ name: "odd.service", state: "active" }, "0"],
    ]));
    expect(parseUnits(rows)).toEqual([
      { name: "odd", state: "unknown" }, { name: "ssh", state: "failed" }, { name: "valheim", state: "active" },
    ]);
  });
  it("construit la requête systemd sans laisser passer de guillemet", () => {
    expect(unitsQuery('valheim.*|ssh"}')).toBe('node_systemd_unit_state{type="service",name=~"(valheim.*|ssh})\\\\.service"}');
  });
  it("lit /health/details au schéma service-health, statut hors liste = inconnu", () => {
    const h = parseHealth({ service: "backend", status: "degraded", checked_at: "2026-11-10T08:00:00Z", version: "0.1.0",
      dependencies: [{ name: "database", status: "ok", checked_at: null, latency_ms: 12 }, { name: "ai-gateway", status: "maybe", checked_at: null }, { bad: 1 }] });
    expect(h).toEqual({ service: "backend", status: "degraded", checkedAt: "2026-11-10T08:00:00Z", version: "0.1.0", dependencies: [
      { name: "database", status: "ok", checkedAt: null, latencyMs: 12 }, { name: "ai-gateway", status: "unknown", checkedAt: null, latencyMs: null },
    ] });
    expect(parseHealth({ status: "ok" })).toBeNull();
    expect(appHealthState(h)).toBe("warn");
    expect(appHealthState(null)).toBe("unknown");
  });
  it("formate tailles et durées", () => {
    expect(fmtBytes(104857600)).toBe("100 Mo");
    expect(fmtBytes(null)).toBe("—");
    expect(fmtDuration(90061)).toBe("1 j 1 h");
    expect(fmtDuration(3720)).toBe("1 h 2 min");
  });
});
