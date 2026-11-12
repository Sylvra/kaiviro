/**
 * S5 · Stockage de la Pi : systèmes de fichiers (Node Exporter) et santé SMART (collecteur smartmon).
 * Fonctions pures, testées dans stockage.test.ts. Une carte SD n'expose pas de SMART : santé « Inconnu ».
 */
import type { Etat } from "../types";
import type { Echantillon } from "./mapping";

export const REQUETES_STOCKAGE = {
  taille: 'node_filesystem_size_bytes{fstype="ext4"}',
  libre: 'node_filesystem_avail_bytes{fstype="ext4"}',
  modele: "smartmon_device_info",
  sain: "smartmon_device_smart_healthy",
  heures: "smartmon_power_on_hours_raw_value",
  temperature: "smartmon_temperature_celsius_raw_value",
  majEnAttente: "sum(apt_upgrades_pending)",
  redemarrage: "max(node_reboot_required)",
} as const;

export interface Disque {
  peripherique: string;
  point: string;
  support: string;
  tailleGo: number;
  occupePct: number;
  sante: { etat: Etat; libelle: string };
  heures?: number;
  temperature?: number;
}

const go = (octets: number) => Math.round(octets / 1e9);

/** /dev/sda1 → /dev/sda ; /dev/mmcblk0p2 → /dev/mmcblk0. */
export function disqueParent(peripherique: string): string {
  return peripherique.replace(/p\d+$/, "").replace(/(sd[a-z])\d+$/, "$1");
}

function parDisque(v: Echantillon[] | null): Map<string, Echantillon> {
  return new Map((v ?? []).map((e) => [e.metric.disk ?? "", e]));
}

export function versDisques(r: Record<keyof typeof REQUETES_STOCKAGE, Echantillon[] | null>): Disque[] {
  const libres = new Map((r.libre ?? []).map((e) => [e.metric.mountpoint, Number(e.value[1])]));
  const modeles = parDisque(r.modele);
  const sains = parDisque(r.sain);
  const heures = parDisque(r.heures);
  const temps = parDisque(r.temperature);

  return (r.taille ?? [])
    .map((e): Disque => {
      const taille = Number(e.value[1]);
      const libre = libres.get(e.metric.mountpoint);
      const parent = disqueParent(e.metric.device ?? "");
      const sd = parent.includes("mmcblk");
      const sain = sains.get(parent)?.value[1];
      const h = heures.get(parent)?.value[1];
      const t = temps.get(parent)?.value[1];
      return {
        peripherique: e.metric.device ?? "inconnu",
        point: e.metric.mountpoint ?? "inconnu",
        support: modeles.get(parent)?.metric.device_model ?? (sd ? "Carte SD" : "Disque inconnu"),
        tailleGo: go(taille),
        occupePct: libre === undefined || !taille ? NaN : Math.round((1 - libre / taille) * 1000) / 10,
        sante:
          sain === "1"
            ? { etat: "ok", libelle: "SMART sain" }
            : sain === "0"
              ? { etat: "alerte", libelle: "SMART en échec" }
              : { etat: "inconnu", libelle: sd ? "Pas de SMART sur carte SD" : "SMART non lu" },
        heures: h === undefined ? undefined : Number(h),
        temperature: t === undefined ? undefined : Number(t),
      };
    })
    .sort((a, b) => a.point.localeCompare(b.point));
}
