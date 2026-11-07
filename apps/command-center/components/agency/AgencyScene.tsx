"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { AgencyModel, Zone, ZoneId, ZoneState } from "@/lib/agency";
import { STATUS_LABELS } from "@/lib/data/plan";
import { PARTNER_STAGES } from "@/lib/partners";

/**
 * Scène 3D de l'agence (COMMAND_CENTER_3D.md). Rendu à la demande : aucune boucle tant que rien ne bouge,
 * aucune animation qui simule une activité. Toute donnée affichée vient de AgencyModel.
 */
const C = {
  floor: "#fbf8f2", slab: "#ffffff", ink: "#3b3833", line: "#e6dfd4",
  todo: "#d9d3ca", doing: "#f2b544", review: "#9b87f5", done: "#3fb68b",
  ok: "#3fb68b", warn: "#f2b544", alert: "#e07a52", unknown: "#b9b3aa",
  coral: "#e07a52", mint: "#3fb68b", lav: "#9b87f5", sky: "#3b8ed0", amber: "#f2b544",
};
const STATUS_COLOR = [C.todo, C.doing, C.review, C.done];
const STATE_COLOR: Record<ZoneState, string> = { ok: C.ok, warn: C.warn, alert: C.alert, unknown: C.unknown };
const STATE_LABEL: Record<ZoneState, string> = { ok: "OK", warn: "Attention", alert: "Alerte", unknown: "Inconnu" };
const ADR_COLOR: Record<string, string> = { ACCEPTED: C.mint, PROPOSED: C.lav, OPEN: C.amber, REJECTED: C.coral, SUPERSEDED: C.unknown, NOT_WRITTEN: "#ece7df" };

interface PiState { health: ZoneState; temp: number | null; containers: { name: string; up: boolean }[] | null }

interface Props {
  model: AgencyModel;
  selected: ZoneId | null;
  onSelect: (id: ZoneId) => void;
  reducedMotion: boolean;
  lowPower: boolean;
  theme: "ivoire" | "nuit";
  pi: PiState;
}

/** Palette de la scène selon le thème (les couleurs d'état restent les mêmes). */
const PALETTES = {
  ivoire: { bg: "#fbf9f5", floor: "#fbf8f2", slab: "#ffffff", slabSel: "#fffaf2", building: "#f1ece4", window: "#d8d1c6", sky: "#ffffff", ground: "#efe8dc", hemi: 2.1, glow: 0.9, night: false },
  nuit: { bg: "#0b1017", floor: "#101722", slab: "#18212e", slabSel: "#1f2b3b", building: "#1c2634", window: "#3b82f6", sky: "#9fb7d4", ground: "#0b1017", hemi: 1.1, glow: 1.8, night: true },
} as const;
type Palette = (typeof PALETTES)[keyof typeof PALETTES];
const Pal = createContext<Palette>(PALETTES.ivoire);

/** Infobulle DOM accrochée à un objet 3D (polices et contrastes de l'application). */
function Tip({ children, y = 1 }: { children: React.ReactNode; y?: number }) {
  return (
    <Html position={[0, y, 0]} center distanceFactor={14} zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
      <div className="whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[11px] font-semibold text-white shadow-lg">{children}</div>
    </Html>
  );
}

function useHover() {
  const [hover, setHover] = useState(false);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => { document.body.style.cursor = hover ? "pointer" : ""; invalidate(); }, [hover, invalidate]);
  useEffect(() => () => { document.body.style.cursor = ""; }, []);
  return {
    hover,
    bind: {
      onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHover(true); },
      onPointerOut: () => setHover(false),
    },
  };
}

/** Socle d'une zone : dalle, voyant d'état, étiquette, sélection au clic. */
function ZoneBase({ zone, selected, onSelect, size = [5.2, 4.4], children }: { zone: Zone; selected: boolean; onSelect: (id: ZoneId) => void; size?: [number, number]; children?: React.ReactNode }) {
  const { hover, bind } = useHover();
  const P = useContext(Pal);
  const color = STATE_COLOR[zone.state];
  const lift = selected ? 0.12 : hover ? 0.06 : 0;
  // drei <Html> + React 19 : le tout premier rendu d'une étiquette peut se perdre ; on la remonte une fois après l'affichage.
  const [ready, setReady] = useState(false);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => { const t = requestAnimationFrame(() => { setReady(true); invalidate(); }); return () => cancelAnimationFrame(t); }, [invalidate]);
  return (
    <group position={[zone.at[0], lift, zone.at[1]]}>
      <RoundedBox args={[size[0], 0.3, size[1]]} radius={0.12} smoothness={3} castShadow receiveShadow position={[0, 0.15, 0]}
        {...bind} onClick={(e) => { e.stopPropagation(); onSelect(zone.id); }}>
        <meshStandardMaterial color={selected ? P.slabSel : P.slab} roughness={0.85} />
      </RoundedBox>
      {/* liseré de couleur d'état sur le bord avant */}
      <mesh position={[0, 0.31, size[1] / 2 - 0.08]}>
        <boxGeometry args={[size[0] - 0.4, 0.02, 0.08]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* voyant : lumineux seulement si l'état est connu */}
      <group position={[size[0] / 2 - 0.45, 0.3, -size[1] / 2 + 0.45]}>
        <mesh position={[0, 0.35, 0]} castShadow><cylinderGeometry args={[0.05, 0.05, 0.7, 12]} /><meshStandardMaterial color={C.ink} /></mesh>
        <mesh position={[0, 0.8, 0]}>
          <sphereGeometry args={[0.18, 24, 16]} />
          <meshStandardMaterial color={color} emissive={zone.state === "unknown" ? "#000000" : color} emissiveIntensity={zone.state === "unknown" ? 0 : P.glow} roughness={0.4} />
        </mesh>
      </group>
      <Html key={ready ? "label" : "label-init"} position={[0, 0.32, size[1] / 2 + 0.35]} center distanceFactor={16} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[12px] font-semibold shadow-sm ${selected ? "border-[#0f766e] bg-[#0f766e] text-white" : P.night ? "border-[#2a3a4e] bg-[#121a25]/95 text-[#e6ebf2]" : "border-[#e6dfd4] bg-white/95 text-[#1d1b19]"}`}>
          <span className="inline-block size-2 rounded-full" style={{ background: color, opacity: zone.state === "unknown" ? 0.6 : 1 }} />
          {zone.label}
          <span className={selected ? "text-white/75" : "text-[#8a837a]"}>· {STATE_LABEL[zone.state]}</span>
        </div>
      </Html>
      <group position={[0, 0.3, 0]}>{children}</group>
    </group>
  );
}

function Block({ position, color, label, onClick }: { position: [number, number, number]; color: string; label: string; onClick: () => void }) {
  const { hover, bind } = useHover();
  return (
    <group position={position}>
      <RoundedBox args={[0.95, 0.34, 0.95]} radius={0.06} smoothness={2} castShadow {...bind} onClick={(e) => { e.stopPropagation(); onClick(); }} scale={hover ? 1.06 : 1}>
        <meshStandardMaterial color={color} roughness={0.6} />
      </RoundedBox>
      {hover && <Tip y={0.5}>{label}</Tip>}
    </group>
  );
}

/** Trois tours de livrables : un bloc par livrable réel, empilé par statut (terminés en bas). */
function Towers({ model, onSelect }: { model: AgencyModel; onSelect: (id: ZoneId) => void }) {
  return (
    <>
      {model.towers.map((t, ti) => (
        <group key={t.owner} position={[(ti - 1) * 1.55, 0, 0]}>
          {t.blocks.map((b, i) => (
            <Block key={b.id} position={[0, 0.17 + i * 0.36, 0]} color={STATUS_COLOR[b.status]!}
              label={`${t.owner === "C" ? "Commun" : `Mission ${t.owner}`} · ${b.title} · ${STATUS_LABELS[b.status]}`} onClick={() => onSelect("livrables")} />
          ))}
        </group>
      ))}
    </>
  );
}

function Beacons({ model, onSelect }: { model: AgencyModel; onSelect: (id: ZoneId) => void }) {
  const n = model.beacons.length;
  return (
    <>
      {model.beacons.map((b, i) => <Beacon key={b.key} x={(i - (n - 1) / 2) * 0.72} resolved={b.resolved} title={b.title} onClick={() => onSelect("decisions")} />)}
    </>
  );
}

function Beacon({ x, resolved, title, onClick }: { x: number; resolved: boolean; title: string; onClick: () => void }) {
  const { hover, bind } = useHover();
  const h = resolved ? 0.5 : 1.1;
  const color = resolved ? C.mint : C.coral;
  return (
    <group position={[x, 0, 0]} {...bind} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <mesh position={[0, h / 2, 0]} castShadow><cylinderGeometry args={[0.16, 0.22, h, 16]} /><meshStandardMaterial color="#f7f3ec" /></mesh>
      <mesh position={[0, h + 0.14, 0]}><sphereGeometry args={[hover ? 0.2 : 0.17, 20, 14]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={resolved ? 0.2 : 0.8} /></mesh>
      {hover && <Tip y={h + 0.55}>{title} · {resolved ? "tranchée" : "à trancher"}</Tip>}
    </group>
  );
}

function Lanes({ model, onSelect }: { model: AgencyModel; onSelect: (id: ZoneId) => void }) {
  return (
    <>
      {model.lanes.map((l, li) => (
        <group key={l.stage} position={[0, 0, (li - 1.5) * 0.95]}>
          <mesh position={[0, 0.02, 0]} receiveShadow><boxGeometry args={[4.2, 0.04, 0.7]} /><meshStandardMaterial color={["#f6f3ee", "#eef5fc", "#e9f7f1", "#fff6e3"][li]} /></mesh>
          <Html position={[-2.45, 0.05, 0]} center distanceFactor={20} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
            <span className="whitespace-nowrap text-[9px] font-semibold text-[#8a837a]">{PARTNER_STAGES[l.stage]}</span>
          </Html>
          {l.partners.slice(0, 9).map((p, i) => <PartnerOrb key={p.ref} x={-1.6 + i * 0.42} alert={p.alert} label={`${p.ref} ${p.name}`} onClick={() => onSelect("partenaires")} />)}
        </group>
      ))}
    </>
  );
}

function PartnerOrb({ x, alert, label, onClick }: { x: number; alert: boolean; label: string; onClick: () => void }) {
  const { hover, bind } = useHover();
  return (
    <group position={[x, 0.22, 0]} {...bind} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <mesh castShadow><sphereGeometry args={[hover ? 0.2 : 0.17, 20, 14]} /><meshStandardMaterial color={alert ? C.coral : C.sky} roughness={0.35} /></mesh>
      {hover && <Tip y={0.5}>{label}{alert ? " · relance en retard" : ""}</Tip>}
    </group>
  );
}

function Pillars({ model, onSelect }: { model: AgencyModel; onSelect: (id: ZoneId) => void }) {
  const n = Math.max(1, model.pillars.length);
  return <>{model.pillars.map((p, i) => <Pillar key={p.branch} x={(i - (n - 1) / 2) * 1.6} p={p} onClick={() => onSelect("dev")} />)}</>;
}

function Pillar({ x, p, onClick }: { x: number; p: AgencyModel["pillars"][number]; onClick: () => void }) {
  const { hover, bind } = useHover();
  return (
    <group position={[x, 0, 0]} {...bind} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <RoundedBox args={[0.8, p.height, 0.8]} radius={0.06} position={[0, p.height / 2, 0]} castShadow>
        <meshStandardMaterial color={p.exists ? C.lav : "#ece7df"} roughness={0.55} transparent={!p.exists} opacity={p.exists ? 1 : 0.6} />
      </RoundedBox>
      {p.pull !== null && (
        <group position={[0.42, p.height + 0.1, 0]}>
          <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.025, 0.025, 0.6, 8]} /><meshStandardMaterial color={C.ink} /></mesh>
          <mesh position={[0.18, 0.48, 0]}><boxGeometry args={[0.34, 0.2, 0.02]} /><meshStandardMaterial color={C.mint} emissive={C.mint} emissiveIntensity={0.4} /></mesh>
        </group>
      )}
      {hover && <Tip y={p.height + 0.9}>{p.branch} · {!p.exists ? "pas sur GitHub" : p.pull ? `PR #${p.pull}` : "commits en cours"}</Tip>}
    </group>
  );
}

function Books({ model, onSelect }: { model: AgencyModel; onSelect: (id: ZoneId) => void }) {
  return (
    <group position={[-1.9, 0, -0.4]}>
      {model.books.map((b, i) => <Book key={b.id} x={(i % 8) * 0.5} z={Math.floor(i / 8) * 1.3} id={b.id} status={b.status} onClick={() => onSelect("knowledge")} />)}
    </group>
  );
}

function Book({ x, z, id, status, onClick }: { x: number; z: number; id: string; status: string; onClick: () => void }) {
  const { hover, bind } = useHover();
  const written = status !== "NOT_WRITTEN";
  const h = written ? 0.9 : 0.5;
  return (
    <group position={[x, 0, z]} {...bind} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <mesh position={[0, h / 2, 0]} castShadow scale={hover ? 1.08 : 1}><boxGeometry args={[0.32, h, 0.75]} /><meshStandardMaterial color={ADR_COLOR[status] ?? C.unknown} roughness={0.7} /></mesh>
      {hover && <Tip y={h + 0.35}>{id} · {written ? status : "à rédiger"}</Tip>}
    </group>
  );
}

/**
 * Baie de la Pi : un emplacement par conteneur réel (cAdvisor) ; sans données, un par source de supervision (S4–S7), gris.
 * Le liseré de la baie prend la couleur de santé de l'hôte (température, disque, mémoire).
 */
function Rack({ model, pi }: { model: AgencyModel; pi: PiState }) {
  const P = useContext(Pal);
  const slots = pi.containers?.length
    ? pi.containers.slice(0, 8).map((c) => ({ key: c.name, label: c.name, color: c.up ? C.mint : C.coral, lit: true }))
    : model.services.map((s) => ({ key: s.name, label: s.name, color: s.connected ? C.mint : C.unknown, lit: s.connected }));
  const h = Math.max(2.4, 0.4 + slots.length * 0.34);
  const health = STATE_COLOR[pi.health];
  return (
    <group position={[-0.6, 0, 0]}>
      <RoundedBox args={[1.6, h, 1.2]} radius={0.08} position={[0, h / 2, 0]} castShadow><meshStandardMaterial color={P.night ? "#0d131b" : "#2c2a27"} roughness={0.55} metalness={0.2} /></RoundedBox>
      <mesh position={[0, h / 2, 0.605]}><boxGeometry args={[1.62, h, 0.01]} /><meshStandardMaterial color={health} emissive={pi.health === "unknown" ? "#000" : health} emissiveIntensity={pi.health === "unknown" ? 0 : 0.35 * P.glow} transparent opacity={0.18} /></mesh>
      {slots.map((s, i) => (
        <group key={s.key} position={[0, h - 0.35 - i * 0.34, 0.62]}>
          <mesh><boxGeometry args={[1.3, 0.24, 0.02]} /><meshStandardMaterial color={P.night ? "#1a2432" : "#3d3a36"} /></mesh>
          <mesh position={[0.5, 0, 0.02]}><sphereGeometry args={[0.055, 12, 8]} /><meshStandardMaterial color={s.color} emissive={s.lit ? s.color : "#000"} emissiveIntensity={s.lit ? P.glow : 0} /></mesh>
        </group>
      ))}
      <Html position={[1.5, h / 2, 0]} center distanceFactor={18} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div className={`w-40 rounded-lg border p-1.5 text-[10px] leading-tight ${P.night ? "border-[#2a3a4e] bg-[#121a25]/95 text-[#b3bfcd]" : "border-[#e6dfd4] bg-white/95 text-[#5f5952]"}`}>
          <div className="mb-0.5 flex justify-between font-semibold"><span>Raspberry Pi 5</span><span>{pi.temp === null ? "— °C" : `${Math.round(pi.temp)} °C`}</span></div>
          {slots.map((s) => <div key={s.key} className="flex justify-between gap-2"><span className="truncate">{s.label}</span><span className="font-semibold">{pi.containers?.length ? (s.color === C.mint ? "actif" : "arrêté") : s.lit ? "branché" : "inconnu"}</span></div>)}
        </div>
      </Html>
    </group>
  );
}

function Building({ h = 1.6 }: { h?: number }) {
  const P = useContext(Pal);
  return (
    <group>
      <RoundedBox args={[2.6, h, 2]} radius={0.1} position={[-0.4, h / 2, 0]} castShadow><meshStandardMaterial color={P.building} roughness={0.9} /></RoundedBox>
      {/* fenêtres éteintes : aucune donnée, aucune activité simulée */}
      {[0, 1, 2].map((i) => <mesh key={i} position={[-1.2 + i * 0.8, h * 0.6, 1.01]}><boxGeometry args={[0.45, 0.4, 0.02]} /><meshStandardMaterial color={P.night ? "#26323f" : P.window} /></mesh>)}
    </group>
  );
}

/** Anneau des jours du plan : passés, jour courant surélevé, à venir. */
function DayRing({ model }: { model: AgencyModel }) {
  const n = model.days.length;
  return (
    <>
      {model.days.map((d, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const today = d.state === "today";
        return (
          <group key={d.n} position={[Math.cos(a) * 1.75, today ? 0.35 : 0.1, Math.sin(a) * 1.55]}>
            <RoundedBox args={[0.6, today ? 0.5 : 0.2, 0.6]} radius={0.05} castShadow>
              <meshStandardMaterial color={today ? C.coral : d.state === "past" ? "#bfe6d6" : "#ece7df"} emissive={today ? C.coral : "#000"} emissiveIntensity={today ? 0.35 : 0} />
            </RoundedBox>
            <Html position={[0, today ? 0.45 : 0.25, 0]} center distanceFactor={20} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
              <span className={`text-[9px] font-bold ${today ? "text-[#a8432a]" : "text-[#8a837a]"}`}>J{d.n}</span>
            </Html>
          </group>
        );
      })}
    </>
  );
}

/** Caméra : se recentre sur la zone choisie (instantané si mouvements réduits). */
function CameraRig({ target, reducedMotion }: { target: [number, number] | null; reducedMotion: boolean }) {
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const invalidate = useThree((s) => s.invalidate);
  const camera = useThree((s) => s.camera);
  const goal = useRef(new THREE.Vector3());
  const moving = useRef(false);

  useEffect(() => {
    if (!controls) return;
    const [x, z] = target ?? [0, 0];
    goal.current.set(x, 0, z);
    if (reducedMotion) {
      const offset = camera.position.clone().sub(controls.target);
      controls.target.copy(goal.current);
      camera.position.copy(goal.current.clone().add(offset));
      controls.update();
      invalidate();
    } else {
      moving.current = true;
      invalidate();
    }
  }, [target, controls, camera, reducedMotion, invalidate]);

  useFrame(() => {
    if (!moving.current || !controls) return;
    const offset = camera.position.clone().sub(controls.target);
    controls.target.lerp(goal.current, 0.12);
    camera.position.copy(controls.target.clone().add(offset));
    controls.update();
    if (controls.target.distanceTo(goal.current) < 0.02) moving.current = false;
    invalidate();
  });
  return null;
}

export default function AgencyScene({ model, selected, onSelect, reducedMotion, lowPower, theme, pi }: Props) {
  const P = PALETTES[theme];
  const byId = useMemo(() => Object.fromEntries(model.zones.map((z) => [z.id, z])) as Record<ZoneId, Zone>, [model.zones]);
  const target = selected ? byId[selected].at : null;
  const z = (id: ZoneId, size: [number, number], children: React.ReactNode) =>
    <ZoneBase key={id} zone={byId[id]} selected={selected === id} onSelect={onSelect} size={size}>{children}</ZoneBase>;

  return (
    // flat : pas de correction de tons, pour garder les pastels de l'identité KAIVIRO.
    <Canvas flat frameloop="demand" dpr={lowPower ? 1 : [1, 2]} shadows={lowPower ? false : "percentage"} camera={{ position: [21, 23, 26], fov: 32, near: 0.5, far: 220 }}
      gl={{ antialias: true, powerPreference: lowPower ? "low-power" : "high-performance" }} aria-hidden>
      <Pal.Provider value={P}>
      <color attach="background" args={[P.bg]} />
      {P.night && <fog attach="fog" args={[P.bg, 38, 70]} />}
      {/* Intensités physiques (three ≥ r155) : valeurs hautes pour un rendu clair et pastel. */}
      <hemisphereLight args={[P.sky, P.ground, P.hemi]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[12, 20, 8]} intensity={1.6} castShadow={!lowPower} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004}
        shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} />

      <RoundedBox args={[32, 0.5, 26]} radius={0.4} smoothness={4} position={[0.5, -0.25, 0.5]} receiveShadow>
        <meshStandardMaterial color={P.floor} roughness={1} />
      </RoundedBox>
      {!lowPower && <ContactShadows position={[0, 0.02, 0]} opacity={0.12} scale={34} blur={3} far={3} frames={1} />}

      {z("overview", [5.4, 4.6], <DayRing model={model} />)}
      {z("livrables", [5.6, 3.6], <Towers model={model} onSelect={onSelect} />)}
      {z("decisions", [5.2, 3], <Beacons model={model} onSelect={onSelect} />)}
      {z("partenaires", [5.6, 4.6], <Lanes model={model} onSelect={onSelect} />)}
      {z("dev", [4.8, 3.4], <Pillars model={model} onSelect={onSelect} />)}
      {z("knowledge", [4.8, 3.8], <Books model={model} onSelect={onSelect} />)}
      {z("infra", [4.8, 3.6], <Rack model={model} pi={pi} />)}
      {z("ai", [4, 3.2], <Building />)}
      {z("auto", [4, 3.2], <Building h={1.2} />)}
      {z("security", [3.6, 3.2], <Building h={1.9} />)}

      <OrbitControls makeDefault enableDamping={!reducedMotion} dampingFactor={0.12} minDistance={10} maxDistance={60}
        maxPolarAngle={Math.PI / 2.35} minPolarAngle={0.35} target={[0, 0, 0]} />
      <CameraRig target={target} reducedMotion={reducedMotion} />
      </Pal.Provider>
    </Canvas>
  );
}
