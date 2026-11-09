"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { CameraControls, ContactShadows, Edges, Environment, Html, Lightformer, RoundedBox, SoftShadows } from "@react-three/drei";
import type CameraControlsImpl from "camera-controls";
import * as THREE from "three";
import type { AgencyModel, Zone, ZoneId, ZoneState } from "@/lib/agency";
import { STATUS_LABELS } from "@/lib/data/plan";
import { PARTNER_STAGES } from "@/lib/partners";

/**
 * Agence KAIVIRO en maquette d'architecte (COMMAND_CENTER_3D.md).
 * - Données réelles uniquement : chaque volume, voyant ou fenêtre allumée vient de AgencyModel.
 *   Une zone sans source reste grise et ses fenêtres restent éteintes : jamais « tout va bien » par défaut.
 * - Rendu à la demande (frameloop « demand ») : la scène ne recalcule que pendant une interaction ou une transition.
 * - Mouvements réduits : transitions de caméra et soulèvements instantanés.
 */

const STATE_COLOR: Record<ZoneState, string> = { ok: "#14b8a6", warn: "#e0a100", alert: "#e07a52", unknown: "#b9b3aa" };
const STATE_LABEL: Record<ZoneState, string> = { ok: "OK", warn: "Attention", alert: "Alerte", unknown: "Inconnu" };
const STATUS_COLOR = ["#ddd6cb", "#f2b544", "#9b87f5", "#2fb393"];
const TONE = { mint: "#2fb393", coral: "#e07a52", lav: "#9b87f5", sky: "#3b8ed0", amber: "#f2b544" };
const ADR_COLOR: Record<string, string> = { ACCEPTED: TONE.mint, PROPOSED: TONE.lav, OPEN: TONE.amber, REJECTED: TONE.coral, SUPERSEDED: "#b9b3aa" };

const PALETTES = {
  ivoire: {
    night: false, plinth: "#f8f6f1", plinthSide: "#d9d0c2", grid: "#e2dbcf", road: "#ece5da", parcel: "#ffffff", parcelHi: "#fffdf8",
    building: "#f2ede5", roof: "#e6dfd3", post: "#55504a", windowOff: "#d8d1c5", windowOn: "#7fd0c0", shelf: "#e9e2d7",
    lanes: ["#f3efe8", "#e8f1fa", "#e3f4ee", "#fbf1dc", "#ece9e4"],
    key: 2.6, keyColor: "#fff5e8", hemiSky: "#ffffff", hemiGround: "#e6dccb", hemi: 1.05, amb: 0.32, env: 0.55, glow: 0.5,
    shadow: 0.32, labelCls: "border-[#e6dfd4] bg-white/95 text-[#1d1b19]", labelMuted: "text-[#6b655d]",
  },
  nuit: {
    night: true, plinth: "#131b26", plinthSide: "#090d13", grid: "#1e2a39", road: "#1a2330", parcel: "#1b2533", parcelHi: "#223042",
    building: "#1f2a39", roof: "#283548", post: "#6b7b90", windowOff: "#253244", windowOn: "#ffc76a", shelf: "#1f2a39",
    lanes: ["#222c3a", "#1c2c40", "#1a3330", "#33301f", "#252a32"],
    key: 1.1, keyColor: "#a9c1ff", hemiSky: "#7f9fe6", hemiGround: "#05080c", hemi: 0.5, amb: 0.16, env: 0.3, glow: 1.6,
    shadow: 0.55, labelCls: "border-[#2a3a4e] bg-[#111822]/95 text-[#e6ebf2]", labelMuted: "text-[#93a3b6]",
  },
} as const;
type Palette = (typeof PALETTES)[keyof typeof PALETTES];
const Pal = createContext<Palette>(PALETTES.ivoire);
const Motion = createContext({ reduced: false });
/** Infobulle partagée : un seul élément DOM hors de la scène (évite de monter/démonter des <Html>). */
const TipCtx = createContext<(text: string | null) => void>(() => undefined);

interface PiState { health: ZoneState; temp: number | null; containers: { name: string; up: boolean }[] | null }

interface Props {
  model: AgencyModel;
  selected: ZoneId | null;
  onSelect: (id: ZoneId) => void;
  onClear: () => void;
  reducedMotion: boolean;
  lowPower: boolean;
  theme: "ivoire" | "nuit";
  pi: PiState;
  /** texte de l'élément survolé, null en sortie */
  onTip: (text: string | null) => void;
  /** incrémenté pour revenir à la vue d'ensemble */
  viewKey: number;
  /** largeur en pixels masquée par les panneaux flottants */
  inset: { left: number; right: number };
}

// ---------- utilitaires ----------

function useHover(tip?: string) {
  const [hover, setHover] = useState(false);
  const invalidate = useThree((s) => s.invalidate);
  const setTip = useContext(TipCtx);
  useEffect(() => { document.body.style.cursor = hover ? "pointer" : ""; invalidate(); }, [hover, invalidate]);
  useEffect(() => () => { document.body.style.cursor = ""; }, []);
  return {
    hover,
    bind: {
      onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHover(true); if (tip) setTip(tip); },
      onPointerOut: () => { setHover(false); if (tip) setTip(null); },
    },
  };
}

/** Amortit la hauteur d'un groupe vers `y` ; ne demande des images que tant qu'il bouge. */
function Lift({ y, children }: { y: number; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  const { reduced } = useContext(Motion);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => { invalidate(); }, [y, invalidate]);
  useFrame((_, dt) => {
    const o = g.current;
    if (!o) return;
    if (reduced) { o.position.y = y; return; }
    o.position.y = THREE.MathUtils.damp(o.position.y, y, 14, dt);
    if (Math.abs(o.position.y - y) > 0.0005) invalidate();
  });
  return <group ref={g}>{children}</group>;
}



// ---------- socle de la maquette ----------

function Plinth() {
  const P = useContext(Pal);
  const grid = useMemo(() => {
    const pts: number[] = [];
    const w = 15, d = 12;
    for (let x = -w; x <= w; x += 2) pts.push(x, 0, -d, x, 0, d);
    for (let z = -d; z <= d; z += 2) pts.push(-w, 0, z, w, 0, z);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <group position={[0.5, 0, 0.8]}>
      <RoundedBox args={[32, 1.4, 26]} radius={0.55} smoothness={4} position={[0, -0.7, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={P.plinthSide} roughness={0.95} />
      </RoundedBox>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, 0]} receiveShadow>
        <planeGeometry args={[30.9, 24.9]} />
        <meshStandardMaterial color={P.plinth} roughness={1} />
      </mesh>
      <lineSegments geometry={grid} position={[0, 0.006, 0]}>
        <lineBasicMaterial color={P.grid} transparent opacity={P.night ? 0.9 : 0.75} />
      </lineSegments>
    </group>
  );
}

/** Allées du hub central vers chaque zone : la structure de l'agence, pas une donnée. */
function Roads({ zones }: { zones: Zone[] }) {
  const P = useContext(Pal);
  return (
    <>
      {zones.filter((z) => z.id !== "overview").map((z) => {
        const [x, zz] = z.at;
        const dist = Math.hypot(x, zz);
        const start = 3.1, end = dist - 2.1;
        const len = Math.max(0, end - start);
        const dir = [x / dist, zz / dist];
        const mid = start + len / 2;
        return (
          <mesh key={z.id} position={[dir[0]! * mid, 0.012, dir[1]! * mid]} rotation-y={-Math.atan2(zz, x)} receiveShadow>
            <boxGeometry args={[len, 0.02, 0.55]} />
            <meshStandardMaterial color={P.road} roughness={1} />
          </mesh>
        );
      })}
    </>
  );
}

// ---------- parcelle d'une zone ----------

function StatePost({ state, at }: { state: ZoneState; at: [number, number] }) {
  const P = useContext(Pal);
  const color = STATE_COLOR[state];
  const known = state !== "unknown";
  return (
    <group position={[at[0], 0, at[1]]}>
      <mesh position={[0, 0.34, 0]} castShadow><cylinderGeometry args={[0.032, 0.032, 0.68, 10]} /><meshStandardMaterial color={P.post} roughness={0.45} metalness={0.4} /></mesh>
      <mesh position={[0, 0.8, 0]} castShadow>
        <capsuleGeometry args={[0.12, 0.16, 6, 16]} />
        <meshStandardMaterial color={color} roughness={known ? 0.25 : 0.8} emissive={known ? color : "#000000"} emissiveIntensity={known ? P.glow : 0} />
      </mesh>
    </group>
  );
}

function Parcel({ zone, size, selected, focus, onSelect, children }: {
  zone: Zone; size: [number, number]; selected: boolean; focus: boolean; onSelect: (id: ZoneId) => void; children?: React.ReactNode;
}) {
  const P = useContext(Pal);
  const { hover, bind } = useHover(zone.summary);
  const color = STATE_COLOR[zone.state];
  const dim = focus && !selected;
  return (
    <group position={[zone.at[0], 0, zone.at[1]]}>
      <Lift y={selected ? 0.22 : hover ? 0.1 : 0}>
        <RoundedBox args={[size[0], 0.28, size[1]]} radius={0.1} smoothness={3} castShadow receiveShadow position={[0, 0.14, 0]}
          {...bind} onClick={(e) => { e.stopPropagation(); onSelect(zone.id); }}>
          <meshStandardMaterial color={hover || selected ? P.parcelHi : P.parcel} roughness={0.88} />
          {selected && <Edges threshold={25} color="#0f766e" />}
        </RoundedBox>
        {/* chant avant à la couleur de l'état (atténué si inconnu) */}
        <mesh position={[0, 0.14, size[1] / 2 + 0.002]}>
          <planeGeometry args={[size[0] - 0.6, 0.07]} />
          <meshBasicMaterial color={color} toneMapped={false} transparent opacity={zone.state === "unknown" ? 0.5 : 1} />
        </mesh>
        <StatePost state={zone.state} at={[size[0] / 2 - 0.42, size[1] / -2 + 0.42]} />
        <Html position={[0, 0.3, size[1] / 2 + 0.55]} center zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
          <div className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold shadow-[0_6px_16px_-10px_rgb(0_0_0/0.4)] transition-opacity duration-200 ${selected ? "border-[#0f766e] bg-[#0f766e] text-white" : P.labelCls} ${dim ? "opacity-45" : "opacity-100"}`}>
            <span className="inline-block size-2 rounded-full" style={{ background: color, opacity: zone.state === "unknown" ? 0.65 : 1 }} />
            {zone.label}
            <span className={selected ? "text-white/80" : P.labelMuted}>· {STATE_LABEL[zone.state]}</span>
          </div>
        </Html>
        <group position={[0, 0.28, 0]}>{children}</group>
      </Lift>
    </group>
  );
}

// ---------- contenus des zones (données réelles) ----------

function Block({ position, color, label }: { position: [number, number, number]; color: string; label: string }) {
  const { hover, bind } = useHover(label);
  return (
    <group position={position}>
      <RoundedBox args={[0.92, 0.32, 0.92]} radius={0.05} smoothness={2} castShadow receiveShadow {...bind} scale={hover ? 1.07 : 1}>
        <meshStandardMaterial color={color} roughness={0.55} />
      </RoundedBox>
    </group>
  );
}

/** Trois tours : un bloc par livrable réel, terminés en bas. */
function Towers({ model }: { model: AgencyModel }) {
  return (
    <>
      {model.towers.map((t, ti) => (
        <group key={t.owner} position={[(ti - 1) * 1.5, 0, -0.2]}>
          {t.blocks.map((b, i) => (
            <Block key={b.id} position={[0, 0.16 + i * 0.335, 0]} color={STATUS_COLOR[b.status]!}
              label={`${t.owner === "C" ? "Commun" : `Mission ${t.owner}`} · ${b.title} · ${STATUS_LABELS[b.status]}`} />
          ))}
        </group>
      ))}
    </>
  );
}

/** Une balise par décision : haute et corail si à trancher, basse et menthe si tranchée. */
function Beacons({ model }: { model: AgencyModel }) {
  const n = model.beacons.length;
  return <>{model.beacons.map((b, i) => <Beacon key={b.key} x={(i - (n - 1) / 2) * 0.7} resolved={b.resolved} title={b.title} />)}</>;
}

function Beacon({ x, resolved, title }: { x: number; resolved: boolean; title: string }) {
  const P = useContext(Pal);
  const { hover, bind } = useHover(`${title} · ${resolved ? "tranchée" : "à trancher"}`);
  const h = resolved ? 0.45 : 1.15;
  const color = resolved ? TONE.mint : TONE.coral;
  return (
    <group position={[x, 0, 0]} {...bind}>
      <mesh position={[0, h / 2, 0]} castShadow><cylinderGeometry args={[0.15, 0.2, h, 20]} /><meshStandardMaterial color={P.building} roughness={0.8} /></mesh>
      <mesh position={[0, h + 0.15, 0]} castShadow>
        <sphereGeometry args={[hover ? 0.19 : 0.16, 24, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={resolved ? 0.15 : P.glow * 0.9} roughness={0.3} />
      </mesh>
    </group>
  );
}

/** Couloirs du pipeline partenaires, une sphère par fiche (nom d'organisation seulement). */
function Lanes({ model, detail }: { model: AgencyModel; detail: boolean }) {
  const P = useContext(Pal);
  const n = model.lanes.length;
  return (
    <>
      {model.lanes.map((l, li) => (
        <group key={l.stage} position={[0.25, 0, (li - (n - 1) / 2) * 0.78]}>
          <RoundedBox args={[4.3, 0.05, 0.6]} radius={0.02} position={[0, 0.025, 0]} receiveShadow>
            <meshStandardMaterial color={P.lanes[li] ?? P.lanes[0]} roughness={0.95} />
          </RoundedBox>
          {detail && <LaneLabel x={-2.55} text={PARTNER_STAGES[l.stage]} />}
          {l.partners.slice(0, 9).map((p, i) => <Orb key={p.ref} x={-1.75 + i * 0.44} alert={p.alert} label={`${p.ref} ${p.name}`} />)}
        </group>
      ))}
    </>
  );
}

function LaneLabel({ x, text }: { x: number; text: string }) {
  const P = useContext(Pal);
  return (
    <Html position={[x, 0.06, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
      <span className={`whitespace-nowrap text-[9px] font-semibold ${P.labelMuted}`}>{text}</span>
    </Html>
  );
}

function Orb({ x, alert, label }: { x: number; alert: boolean; label: string }) {
  const { hover, bind } = useHover(`${label}${alert ? " · relance en retard" : ""}`);
  return (
    <group position={[x, 0.22, 0]} {...bind}>
      <mesh castShadow><sphereGeometry args={[hover ? 0.19 : 0.16, 24, 16]} /><meshStandardMaterial color={alert ? TONE.coral : TONE.sky} roughness={0.3} /></mesh>
    </group>
  );
}

/** Un pilier par branche de mission : hauteur = commits d'avance, fanion si une PR est ouverte. */
function Pillars({ model }: { model: AgencyModel }) {
  const n = Math.max(1, model.pillars.length);
  if (model.pillars.length === 0) return <EmptySign text="GitHub non connecté" />;
  return <>{model.pillars.map((p, i) => <Pillar key={p.branch} x={(i - (n - 1) / 2) * 1.5} p={p} />)}</>;
}

function Pillar({ x, p }: { x: number; p: AgencyModel["pillars"][number] }) {
  const P = useContext(Pal);
  const { bind } = useHover(`${p.branch} · ${!p.exists ? "pas sur GitHub" : p.pull ? `PR #${p.pull}` : "commits en cours"}`);
  return (
    <group position={[x, 0, 0]} {...bind}>
      <RoundedBox args={[0.78, p.height, 0.78]} radius={0.06} position={[0, p.height / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={p.exists ? TONE.lav : P.windowOff} roughness={0.5} transparent={!p.exists} opacity={p.exists ? 1 : 0.6} />
      </RoundedBox>
      {p.pull !== null && (
        <group position={[0.4, p.height, 0]}>
          <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.022, 0.022, 0.6, 8]} /><meshStandardMaterial color={P.post} /></mesh>
          <mesh position={[0.18, 0.5, 0]}><boxGeometry args={[0.34, 0.2, 0.02]} /><meshStandardMaterial color={TONE.mint} emissive={TONE.mint} emissiveIntensity={0.35} /></mesh>
        </group>
      )}
    </group>
  );
}

/** Bibliothèque des ADR : un volume par ADR, hauteur pleine si rédigée. */
function Books({ model }: { model: AgencyModel }) {
  const P = useContext(Pal);
  const rows = Math.ceil(model.books.length / 8);
  return (
    <group position={[0, 0, -0.35]}>
      {Array.from({ length: rows }, (_, r) => (
        <RoundedBox key={r} args={[4.1, 0.08, 0.95]} radius={0.03} position={[0, 0.04, r * 1.25]} receiveShadow castShadow>
          <meshStandardMaterial color={P.shelf} roughness={0.9} />
        </RoundedBox>
      ))}
      {model.books.map((b, i) => <Book key={b.id} x={-1.75 + (i % 8) * 0.5} z={Math.floor(i / 8) * 1.25} id={b.id} status={b.status} />)}
    </group>
  );
}

function Book({ x, z, id, status }: { x: number; z: number; id: string; status: string }) {
  const P = useContext(Pal);
  const { hover, bind } = useHover(`${id} · ${status !== "NOT_WRITTEN" ? status : "à rédiger"}`);
  const written = status !== "NOT_WRITTEN";
  const h = written ? 0.92 : 0.42;
  return (
    <group position={[x, 0.08, z]} {...bind}>
      <RoundedBox args={[0.32, h, 0.72]} radius={0.03} smoothness={2} position={[0, h / 2, 0]} castShadow scale={hover ? 1.07 : 1}>
        <meshStandardMaterial color={written ? ADR_COLOR[status] ?? "#b9b3aa" : P.windowOff} roughness={0.7} />
      </RoundedBox>
    </group>
  );
}

/** Baie de la Pi : un emplacement par conteneur réel ; sans supervision, un par source S4–S7, éteint. */
function Rack({ model, pi, detail }: { model: AgencyModel; pi: PiState; detail: boolean }) {
  const P = useContext(Pal);
  const slots = pi.containers?.length
    ? pi.containers.slice(0, 8).map((c) => ({ key: c.name, label: c.name, color: c.up ? TONE.mint : TONE.coral, lit: true, status: c.up ? "actif" : "arrêté" }))
    : model.services.map((s) => ({ key: s.name, label: s.name, color: s.connected ? TONE.mint : "#8f887f", lit: s.connected, status: s.connected ? "branché" : "inconnu" }));
  const h = Math.max(2.3, 0.45 + slots.length * 0.34);
  const health = STATE_COLOR[pi.health];
  return (
    <group position={[-0.7, 0, 0]}>
      <RoundedBox args={[1.55, h, 1.15]} radius={0.08} position={[0, h / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={P.night ? "#0c1118" : "#2d2b28"} roughness={0.45} metalness={0.25} />
      </RoundedBox>
      <mesh position={[0, h / 2, 0.585]}>
        <planeGeometry args={[1.4, h - 0.12]} />
        <meshBasicMaterial color={health} transparent opacity={pi.health === "unknown" ? 0.05 : 0.14} toneMapped={false} />
      </mesh>
      {slots.map((s, i) => (
        <group key={s.key} position={[0, h - 0.36 - i * 0.34, 0.6]}>
          <mesh><boxGeometry args={[1.25, 0.24, 0.02]} /><meshStandardMaterial color={P.night ? "#18222f" : "#3d3a36"} roughness={0.6} /></mesh>
          <mesh position={[0.48, 0, 0.02]}><sphereGeometry args={[0.05, 12, 8]} /><meshStandardMaterial color={s.color} emissive={s.lit ? s.color : "#000"} emissiveIntensity={s.lit ? P.glow * 1.4 : 0} /></mesh>
        </group>
      ))}
      {detail && <Html position={[1.75, h * 0.62, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div className={`w-44 rounded-xl border p-2 text-[10px] leading-snug shadow-[0_8px_20px_-12px_rgb(0_0_0/0.45)] ${P.labelCls}`}>
          <div className="mb-1 flex justify-between font-semibold"><span>Raspberry Pi 5</span><span className="tabular-nums">{pi.temp === null ? "— °C" : `${Math.round(pi.temp)} °C`}</span></div>
          {slots.map((s) => <div key={s.key} className="flex justify-between gap-2"><span className="truncate">{s.label}</span><span className={`font-semibold ${s.lit ? "" : P.labelMuted}`}>{s.status}</span></div>)}
        </div>
      </Html>}
    </group>
  );
}

/** Fenêtres : allumées seulement si la zone a une mesure réelle. */
function Windows({ count, y, width, z, lit }: { count: number; y: number; width: number; z: number; lit: boolean }) {
  const P = useContext(Pal);
  const step = width / count;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} position={[-width / 2 + step * (i + 0.5), y, z]}>
          <planeGeometry args={[step * 0.55, 0.32]} />
          <meshStandardMaterial color={lit ? P.windowOn : P.windowOff} emissive={lit ? P.windowOn : "#000"} emissiveIntensity={lit ? P.glow : 0} roughness={0.3} />
        </mesh>
      ))}
    </>
  );
}

/** AI Laboratory : pavillon à coupole. */
function AiLab({ lit }: { lit: boolean }) {
  const P = useContext(Pal);
  return (
    <group>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow><cylinderGeometry args={[1.25, 1.3, 1, 40]} /><meshStandardMaterial color={P.building} roughness={0.9} /></mesh>
      <mesh position={[0, 1, 0]} castShadow><sphereGeometry args={[1.18, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={P.roof} roughness={0.7} /></mesh>
      <Windows count={4} y={0.5} width={1.6} z={1.29} lit={lit} />
    </group>
  );
}

/** Automotive : atelier à toit en voûte. */
function Garage({ lit }: { lit: boolean }) {
  const P = useContext(Pal);
  return (
    <group>
      <RoundedBox args={[2.9, 0.9, 1.9]} radius={0.06} position={[0, 0.45, 0]} castShadow receiveShadow><meshStandardMaterial color={P.building} roughness={0.9} /></RoundedBox>
      <mesh position={[0, 0.9, 0]} rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.95, 0.95, 2.9, 32, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color={P.roof} roughness={0.75} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.36, 0.96]}><planeGeometry args={[1.3, 0.62]} /><meshStandardMaterial color={lit ? P.windowOn : P.windowOff} roughness={0.5} /></mesh>
    </group>
  );
}

/** Security & Incidents : tour de garde. */
function Watchtower({ lit }: { lit: boolean }) {
  const P = useContext(Pal);
  return (
    <group>
      <RoundedBox args={[1.5, 2.2, 1.5]} radius={0.08} position={[0, 1.1, 0]} castShadow receiveShadow><meshStandardMaterial color={P.building} roughness={0.9} /></RoundedBox>
      <RoundedBox args={[1.85, 0.22, 1.85]} radius={0.05} position={[0, 2.3, 0]} castShadow><meshStandardMaterial color={P.roof} roughness={0.8} /></RoundedBox>
      <Windows count={2} y={1.55} width={1.1} z={0.76} lit={lit} />
      <Windows count={2} y={0.85} width={1.1} z={0.76} lit={lit} />
    </group>
  );
}

function EmptySign({ text }: { text: string }) {
  const P = useContext(Pal);
  return (
    <Html position={[0, 0.3, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
      <span className={`whitespace-nowrap rounded-full border border-dashed px-2 py-0.5 text-[10px] font-semibold ${P.labelCls}`}>{text}</span>
    </Html>
  );
}

/** Hub Executive : anneau des jours du plan et jauge d'avancement des livrables. */
function Hub({ model }: { model: AgencyModel }) {
  const P = useContext(Pal);
  const n = model.days.length;
  const total = model.towers.reduce((s, t) => s + t.blocks.length, 0);
  const done = model.towers.reduce((s, t) => s + t.blocks.filter((b) => b.status === 3).length, 0);
  const ratio = total ? done / total : 0;
  return (
    <group>
      <mesh position={[0, 0.06, 0]} receiveShadow castShadow><cylinderGeometry args={[1.05, 1.1, 0.12, 48]} /><meshStandardMaterial color={P.building} roughness={0.85} /></mesh>
      {/* jauge : arc proportionnel aux livrables terminés */}
      <mesh position={[0, 0.14, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.72, 0.9, 64]} />
        <meshBasicMaterial color={P.windowOff} toneMapped={false} />
      </mesh>
      {ratio > 0 && (
        <mesh position={[0, 0.145, 0]} rotation-x={-Math.PI / 2} rotation-z={Math.PI / 2}>
          <ringGeometry args={[0.72, 0.9, 64, 1, 0, -ratio * Math.PI * 2]} />
          <meshBasicMaterial color={TONE.mint} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      )}
      {model.days.map((d, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const today = d.state === "today";
        const h = today ? 0.5 : 0.18;
        return (
          <group key={d.n} position={[Math.cos(a) * 1.8, 0, Math.sin(a) * 1.6]}>
            <RoundedBox args={[0.52, h, 0.52]} radius={0.05} position={[0, h / 2, 0]} castShadow receiveShadow>
              <meshStandardMaterial color={today ? TONE.coral : d.state === "past" ? "#bfe6d6" : P.windowOff} emissive={today ? TONE.coral : "#000"} emissiveIntensity={today ? P.glow * 0.6 : 0} roughness={0.6} />
            </RoundedBox>
            <DayLabel n={d.n} y={h + 0.18} today={today} />
          </group>
        );
      })}
    </group>
  );
}

function DayLabel({ n, y, today }: { n: number; y: number; today: boolean }) {
  const P = useContext(Pal);
  return (
    <Html position={[0, y, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
      <span className={`text-[9px] font-bold tabular-nums ${today ? "text-[#c2512f]" : P.labelMuted}`}>J{n}</span>
    </Html>
  );
}

// ---------- caméra ----------

const HOME: [number, number, number, number, number, number] = [34, 37, 46, 0.5, 0, 1.5];

/**
 * Caméra : vue d'ensemble ou zone choisie. Le décalage focal recentre la maquette dans l'espace
 * laissé libre par les panneaux (liste à gauche, détails à droite), sans changer l'angle de vue.
 */
function Rig({ target, viewKey, inset }: { target: [number, number] | null; viewKey: number; inset: { left: number; right: number } }) {
  const ref = useRef<CameraControlsImpl>(null);
  const { reduced } = useContext(Motion);
  const size = useThree((s) => s.size);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    if (target) {
      const [x, z] = target;
      void c.setLookAt(x + 12.5, 15, z + 16.5, x, 0.8, z, !reduced);
    } else {
      void c.setLookAt(...HOME, !reduced);
    }
  }, [target, viewKey, reduced]);
  useEffect(() => {
    const c = ref.current;
    if (!c || size.width === 0) return;
    // Part de la largeur masquée par les panneaux → décalage en unités de scène à la distance actuelle.
    const shift = (inset.right - inset.left) / 2 / size.width;
    const dist = target ? 24 : Math.hypot(HOME[0] - HOME[3], HOME[1] - HOME[4], HOME[2] - HOME[5]);
    const halfWidth = Math.tan(THREE.MathUtils.degToRad(15)) * dist * (size.width / size.height);
    void c.setFocalOffset(shift * 2 * halfWidth, 0, 0, !reduced);
  }, [inset.left, inset.right, size.width, size.height, target, reduced]);
  return (
    <CameraControls ref={ref} makeDefault minDistance={7} maxDistance={78} minPolarAngle={0.2} maxPolarAngle={Math.PI / 2.3}
      smoothTime={reduced ? 0 : 0.55} draggingSmoothTime={reduced ? 0 : 0.12} dollyToCursor />
  );
}

// ---------- scène ----------

const SIZES: Record<ZoneId, [number, number]> = {
  overview: [5.6, 4.8], livrables: [5.6, 3.8], decisions: [5.4, 3], partenaires: [5.8, 4.8], dev: [5, 3.4],
  knowledge: [4.9, 3.9], infra: [5, 3.6], ai: [4, 3.4], auto: [4.2, 3.2], security: [3.4, 3.2],
};

export default function AgencyScene({ model, selected, onSelect, onClear, reducedMotion, lowPower, theme, pi, viewKey, inset, onTip }: Props) {
  const P = PALETTES[theme];
  const byId = useMemo(() => Object.fromEntries(model.zones.map((z) => [z.id, z])) as Record<ZoneId, Zone>, [model.zones]);
  const target = selected ? byId[selected].at : null;
  const lit = (id: ZoneId) => byId[id].state !== "unknown";
  const content: Partial<Record<ZoneId, React.ReactNode>> = {
    overview: <Hub model={model} />,
    livrables: <Towers model={model} />,
    decisions: <Beacons model={model} />,
    partenaires: <Lanes model={model} detail={selected === "partenaires"} />,
    dev: <Pillars model={model} />,
    knowledge: <Books model={model} />,
    infra: <Rack model={model} pi={pi} detail={selected === "infra"} />,
    ai: <AiLab lit={lit("ai")} />,
    auto: <Garage lit={lit("auto")} />,
    security: <Watchtower lit={lit("security")} />,
  };

  return (
    <Canvas flat shadows={!lowPower} frameloop="demand" dpr={lowPower ? 1 : [1, 2]}
      camera={{ position: [HOME[0], HOME[1], HOME[2]], fov: 30, near: 0.5, far: 260 }}
      gl={{ antialias: true, alpha: true, powerPreference: lowPower ? "low-power" : "high-performance" }}
      onPointerMissed={onClear} aria-hidden>
      <Pal.Provider value={P}>
        <Motion.Provider value={{ reduced: reducedMotion }}>
        <TipCtx.Provider value={onTip}>
          {!lowPower && <SoftShadows size={20} samples={12} focus={0.6} />}
          <ambientLight intensity={P.amb} />
          <hemisphereLight args={[P.hemiSky, P.hemiGround, P.hemi]} />
          <directionalLight position={[16, 28, 13]} intensity={P.key} color={P.keyColor} castShadow={!lowPower}
            shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003} shadow-normalBias={0.02}
            shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={22} shadow-camera-bottom={-22} shadow-camera-far={90} />
          <Environment resolution={128} frames={1} environmentIntensity={P.env}>
            <Lightformer form="rect" intensity={P.night ? 0.8 : 2.2} position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={[24, 24, 1]} color="#ffffff" />
            <Lightformer form="rect" intensity={P.night ? 1 : 1.4} position={[-14, 5, 10]} rotation-y={Math.PI / 4} scale={[8, 4, 1]} color={P.night ? "#7aa2ff" : "#fff1de"} />
          </Environment>

          <Plinth />
          {!lowPower && <ContactShadows position={[0.5, -1.42, 0.8]} opacity={P.shadow} scale={52} blur={2.8} far={6} frames={1} resolution={512} />}
          <Roads zones={model.zones} />

          {model.zones.map((z) => (
            <Parcel key={z.id} zone={z} size={SIZES[z.id]} selected={selected === z.id} focus={selected !== null} onSelect={onSelect}>
              {content[z.id]}
            </Parcel>
          ))}

          <Rig target={target} viewKey={viewKey} inset={inset} />
        </TipCtx.Provider>
        </Motion.Provider>
      </Pal.Provider>
    </Canvas>
  );
}
