import { notFound } from "next/navigation";
import { Ban, FolderClosed, GitBranch, ShieldCheck } from "lucide-react";
import { PiIcon } from "@/components/Board";
import { TONE } from "@/components/tone";
import { Panel, PanelTitle, Pill, SourceNote, UnknownTile, cx } from "@/components/ui";
import {
  AGENTS, CLOUD, COMPAT_COLUMNS, CONTAINERS, DEPARTMENTS, EVAL_DIMENSIONS, FORBIDDEN, HEALTH_CHECKS, NETWORK,
  PERMISSIONS, PI_GAUGES, PI_SPECS, REPO_DOCS, SEVERITIES, VAULT_FOLDERS, type DeptKey, type Tone,
} from "@/lib/data/ops";
import { getAdrs, getBranches, getOpenPullCount } from "@/lib/queries";
import { getSourceStatuses } from "@/lib/sources/registry";

export function generateStaticParams() {
  return DEPARTMENTS.map((d) => ({ dept: d.key }));
}

export async function generateMetadata({ params }: { params: Promise<{ dept: string }> }) {
  const { dept } = await params;
  return { title: DEPARTMENTS.find((d) => d.key === dept)?.name ?? "Opérations" };
}

const PHASE_TONE: Record<string, Tone> = { M0: "mint", "M0/M1": "sky", M1: "lavender", M2: "amber" };
const WHEN_TONE: Record<string, Tone> = { "Socle futur": "sky", "MVP+": "mint", "Après MVP": "lavender", "Plus tard": "neutral" };

function Th({ children }: { children: React.ReactNode }) {
  return <th scope="col" className="border-b border-line-soft px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cx("border-b border-[#f4f0ea] px-2 py-2.5", className)}>{children}</td>;
}

export default async function Page({ params }: { params: Promise<{ dept: string }> }) {
  const { dept } = await params;
  const d = DEPARTMENTS.find((x) => x.key === dept);
  if (!d) notFound();
  const t = TONE[d.tone];

  return (
    <>
      <header className="flex flex-wrap items-center gap-4 border-b border-line-soft px-6 pb-4 pt-5">
        <span className={cx("grid size-[46px] place-items-center rounded-[14px] font-mono text-sm font-semibold", t.bg, t.ink)}>{d.num}</span>
        <div className="flex min-w-[240px] flex-1 flex-col gap-0.5">
          <span className="text-xs text-ink-3">Opérations <span aria-hidden>›</span> Département {d.num}</span>
          <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em]">{d.name}</h1>
        </div>
        <span className="max-w-[360px] text-xs text-ink-2">{d.goal}</span>
        <span className="inline-flex h-[34px] items-center gap-2 rounded-full bg-amber-bg px-3 text-xs font-semibold text-amber-ink"><span className="size-[7px] rounded-full border-[1.5px] border-[#b07a00]" />{d.phase}</span>
      </header>
      <div className="flex flex-col gap-4 px-6 pb-6 pt-5">
        {await renderDept(d.key)}
      </div>
    </>
  );
}

async function renderDept(key: DeptKey) {
  switch (key) {
    case "overview": {
      const sources = await getSourceStatuses();
      return (
        <>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
            {HEALTH_CHECKS.map((h) => <UnknownTile key={h.name} label={h.name} source={h.source} />)}
          </div>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {[
              { label: "Dernier backup", value: "Aucun", note: "Restauration jamais testée · prévue J9", cls: "border-[#f3e2b3] bg-[#fff6de]", ink: "text-amber-ink", src: "S6 · journal de sauvegarde" },
              { label: "Dernier déploiement", value: "Aucun", note: "Aucun pipeline de déploiement en M0", cls: "border-line bg-surface-2", ink: "text-ink-2", src: "S1 · GitHub releases" },
              { label: "Incidents ouverts", value: "0 enregistré", note: "Registre des incidents en CC-M3", cls: "border-[#d3eee3] bg-[#eaf7f2]", ink: "text-mint-ink", src: "S8 · admin.incidents" },
            ].map((c) => (
              <article key={c.label} className={cx("flex flex-col gap-1.5 rounded-[18px] border p-4", c.cls)}>
                <span className={cx("text-xs font-semibold", c.ink)}>{c.label}</span>
                <span className="font-display text-[22px] font-bold">{c.value}</span>
                <span className="text-xs text-ink-2">{c.note}</span>
                <span data-source={c.src} className="font-mono text-[11px] text-ink-3">{c.src}</span>
              </article>
            ))}
          </div>
          <Panel>
            <PanelTitle aside="CRM_SPEC §4">Sources de données</PanelTitle>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-[13px]">
                <thead><tr><Th>Source</Th><Th>Alimente</Th><Th>Responsable</Th><Th>Phase</Th><Th>État</Th></tr></thead>
                <tbody>
                  {sources.map((s) => (
                    <tr key={s.id} className="transition-colors hover:bg-surface-2">
                      <Td className="font-semibold"><span className="mr-2 font-mono text-[11px] text-ink-3">{s.id}</span>{s.name}</Td>
                      <Td className="text-ink-2">{s.feeds}</Td>
                      <Td><Pill tone={s.owner === "A" ? "mint" : "lavender"}>Mission {s.owner}</Pill></Td>
                      <Td className="font-mono text-xs">{s.phase}</Td>
                      <Td>{s.connected ? <Pill tone="mint" dot>connectée</Pill> : <span className="text-xs text-ink-3">non connectée · {s.reason}</span>}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      );
    }
    case "infrastructure":
      return (
        <>
          <div className="flex flex-wrap gap-3.5">
            <section className="flex min-w-0 flex-[999_1_520px] flex-col gap-4 rounded-[var(--radius-panel)] border border-[#d3eee3] bg-gradient-to-br from-[#eaf7f2] to-[#f6fbf9] p-5">
              <div className="flex flex-wrap items-center gap-3.5">
                <PiIcon size={52} />
                <div className="flex flex-1 flex-col gap-0.5"><h2 className="text-lg font-bold">Raspberry Pi 5 — centre d’administration</h2><span className="font-mono text-xs text-ink-2">{PI_SPECS}</span></div>
                <Pill tone="coral">Non installée</Pill>
              </div>
              <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(130px,1fr))]">
                {PI_GAUGES.map((g) => (
                  <div key={g} className="flex items-center gap-3 rounded-2xl border border-[#e3f1eb] bg-white p-3.5">
                    <svg width="46" height="46" viewBox="0 0 40 40" aria-hidden><circle cx="20" cy="20" r="15" fill="none" stroke="#EFE9E1" strokeWidth="5" strokeDasharray="4 3.85" /></svg>
                    <span className="flex flex-col leading-tight"><span className="text-xs text-ink-3">{g}</span><span className="font-display text-lg font-bold text-ghost" aria-label="valeur inconnue">—</span><span data-source="S5 · Node Exporter" className="text-[11px] text-ink-3">S5 · Node Exporter</span></span>
                  </div>
                ))}
              </div>
            </section>
            <Panel tone="soft" className="flex-[1_1_280px]">
              <PanelTitle>Réseau</PanelTitle>
              {NETWORK.map((n) => (
                <div key={n.name} className="flex justify-between gap-3 border-b border-[#f1ede7] py-2.5">
                  <span className="flex flex-col"><span className="text-[13px] font-semibold">{n.name}</span><span className="text-xs text-ink-3">{n.rule}</span></span>
                  <span className="text-right font-mono text-xs text-ink-2">{n.value}</span>
                </div>
              ))}
            </Panel>
          </div>
          <Panel>
            <PanelTitle aside="Cahier des charges §12.2 · appliqués par Johan">Conteneurs de la Pi</PanelTitle>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-[13px]">
                <thead><tr><Th>Composant</Th><Th>Rôle</Th><Th>Phase</Th><Th>État</Th></tr></thead>
                <tbody>{CONTAINERS.map((c) => (
                  <tr key={c.name} className="transition-colors hover:bg-surface-2"><Td className="font-semibold">{c.name}</Td><Td className="text-ink-2">{c.role}</Td><Td><Pill tone={PHASE_TONE[c.phase]} className="font-mono">{c.phase}</Pill></Td><Td className="text-xs text-ink-3">planifié</Td></tr>
                ))}</tbody>
              </table>
            </div>
          </Panel>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            {CLOUD.map((c) => (
              <article key={c.name} className="flex flex-col gap-1.5 rounded-[18px] border border-dashed border-[#dcd5cb] bg-surface-2 p-4">
                <span className="flex justify-between"><span className="font-semibold">{c.name}</span><span className="text-[11px] font-semibold text-ink-3">non créé</span></span>
                <span className="text-xs text-ink-2">{c.role}</span>
                <span className="font-mono text-[11px] text-ink-3">{c.ref}</span>
              </article>
            ))}
          </div>
        </>
      );
    case "ai":
      return (
        <>
          <p className="rounded-2xl border border-[#e3ddfa] bg-[#f2effd] px-4 py-3.5 text-[13px] text-[#3a2e8c]">Le Command Center n’affiche jamais les conversations des utilisateurs : uniquement des statistiques agrégées et minimisées.</p>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
            {[["Modèles disponibles", "S9 · passerelle IA"], ["Latence médiane", "S9 · passerelle IA"], ["Documents indexés", "Knowledge Engine (Mission B)"], ["Taux de réussite des tests", "jeux d’évaluation (Mission B)"]].map(([l, s]) => <UnknownTile key={l} label={l!} source={s!} size="md" />)}
          </div>
          <Panel>
            <PanelTitle aside="Cahier des charges §9.3">Agents prévus</PanelTitle>
            <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
              {AGENTS.map((a) => (
                <div key={a.name} className="flex flex-col gap-1.5 rounded-[var(--radius-card)] border border-line-soft bg-white p-3.5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
                  <span className="flex justify-between gap-2"><span className="text-[13px] font-semibold">{a.name}</span><Pill tone={WHEN_TONE[a.when]}>{a.when}</Pill></span>
                  <span className="text-xs text-ink-3">{a.role}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel tone="soft">
            <PanelTitle>Évaluation</PanelTitle>
            <div className="flex flex-wrap gap-2">{EVAL_DIMENSIONS.map(([k, v]) => <span key={k} className="rounded-full border border-line bg-white px-3 py-1.5 text-xs"><b className="font-semibold">{k}</b> · {v}</span>)}</div>
            <span className="text-xs text-ink-3">Aucun jeu de test exécuté. Résultats attendus à partir de M5.</span>
          </Panel>
        </>
      );
    case "automotive":
      return (
        <>
          <p className="rounded-2xl border border-[#f3e2b3] bg-[#fff6de] px-4 py-3.5 text-[13px] text-[#5a3b00]">Aucune compatibilité n’est annoncée sans essai réel. Lecture seule au MVP : pas d’écriture ECU, pas d’effacement de DTC.</p>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
            {[["Catalogue véhicules", "Mission B · version"], ["Règles de diagnostic", "packages/diagnostic-rules"], ["Base de codes défauts", "sources sous licence"], ["Adaptateurs testés", "matrice M2"]].map(([l, s]) => <UnknownTile key={l} label={l!} source={s!} size="md" />)}
          </div>
          <Panel>
            <PanelTitle aside="packages/schemas/app · essais M2">Matrice de compatibilité</PanelTitle>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-[13px]">
                <thead><tr>{COMPAT_COLUMNS.map((c) => <Th key={c}>{c}</Th>)}</tr></thead>
                <tbody><tr><td colSpan={COMPAT_COLUMNS.length} className="px-2 py-9 text-center text-[13px] text-ink-3">Aucun essai réalisé. La première ligne viendra du premier adaptateur testé sur un véhicule réel.</td></tr></tbody>
              </table>
            </div>
          </Panel>
        </>
      );
    case "development": {
      const [branches, pulls] = await Promise.all([getBranches(), getOpenPullCount()]);
      return (
        <>
          <div className="flex flex-wrap gap-3.5">
            <Panel className="flex-[1_1_380px]">
              <PanelTitle aside={<SourceNote s={branches} />}>Branches · kaiviro</PanelTitle>
              {(branches.value ?? []).map((b) => (
                <div key={b.name} className="flex items-center gap-2.5 rounded-[10px] px-2 py-2.5 transition-colors hover:bg-surface-2">
                  <GitBranch size={16} aria-hidden className="text-ink-2" />
                  <span className="flex-1 font-mono text-xs">{b.name}</span>
                  {b.protected !== null && <Pill tone={b.protected ? "mint" : "amber"}>{b.protected ? "protégée" : "non protégée"}</Pill>}
                  {b.role && <Pill tone={b.name === "main" ? "coral" : b.role === "Mission A" ? "mint" : b.role === "Mission B" ? "lavender" : "neutral"}>{b.role}</Pill>}
                </div>
              ))}
            </Panel>
            <div className="grid min-w-0 flex-[1_1_300px] grid-cols-2 gap-2.5">
              <article className="flex flex-col gap-1.5 rounded-[18px] border border-line bg-surface-2 p-4"><span className="text-xs text-ink-3">Pull requests ouvertes</span><span className={cx("font-display text-2xl font-bold", pulls.value === null && "text-ghost")}>{pulls.value ?? "—"}</span><SourceNote s={pulls} /></article>
              <article className="flex flex-col gap-1.5 rounded-[18px] border border-line bg-surface-2 p-4"><span className="text-xs text-ink-3">CI</span><span className="font-display text-2xl font-bold text-ghost">—</span><span data-source="S1 · GitHub Actions" className="text-xs text-ink-2">workflow à créer (Mission A · A8)</span></article>
              <article className="flex flex-col gap-1.5 rounded-[18px] border border-line bg-surface-2 p-4"><span className="text-xs text-ink-3">Dernière release</span><span className="font-display text-2xl font-bold">aucune</span><span data-source="S1 · GitHub releases" className="text-xs text-ink-2">cible : tag m0.1.0</span></article>
              <article className="flex flex-col gap-1.5 rounded-[18px] border border-line bg-surface-2 p-4"><span className="text-xs text-ink-3">Tickets M1</span><span className="font-display text-2xl font-bold text-ghost">—</span><span data-source="S1 · GitHub issues" className="text-xs text-ink-2">backlog en fin de M0</span></article>
            </div>
          </div>
          <Panel>
            <PanelTitle>Projets du monorepo</PanelTitle>
            <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
              {[["Mobile", "apps/android", "vide en M0", "B"], ["Backend", "services/backend", "vide en M0", "B"], ["Command Center", "apps/command-center", "CC-M1 en cours", "A"], ["Knowledge", "knowledge/", "politique en M0", "B"], ["Infrastructure", "infrastructure/", "propositions en M0", "A"]].map(([n, p, s, o]) => (
                <div key={n} className={cx("flex flex-col gap-1 rounded-[var(--radius-card)] p-3.5", o === "A" ? "bg-[#eaf7f2]" : "bg-[#f2effd]")}><span className="font-semibold">{n}</span><span className="font-mono text-[11px] text-ink-2">{p}</span><span className="text-xs text-ink-3">{s}</span></div>
              ))}
            </div>
          </Panel>
        </>
      );
    }
    case "knowledge": {
      const adrs = await getAdrs();
      const list = adrs.value ?? [];
      const written = list.filter((a) => a.status !== "NOT_WRITTEN" && a.status !== "OPEN").length;
      return (
        <div className="flex flex-wrap items-start gap-3.5">
          <section className="flex min-w-0 flex-[1_1_340px] flex-col gap-2.5 rounded-[var(--radius-panel)] border border-[#e3ddfa] bg-gradient-to-br from-[#f2effd] to-[#faf8ff] p-5">
            <span className="flex items-center justify-between"><h2 className="text-base font-bold">Vault Obsidian</h2><Pill tone="lavender">Google Drive</Pill></span>
            <span className="text-xs text-ink-2">Mémoire du projet, écrite par les humains. Jamais une source de vérité technique.</span>
            {VAULT_FOLDERS.map(([n, u]) => (
              <div key={n} className="flex items-center gap-2.5 rounded-[10px] bg-white/70 px-2.5 py-2"><FolderClosed size={16} className="text-lav-ink" aria-hidden /><span className="flex-1 font-mono text-xs">{n}</span><span className="text-xs text-ink-3">{u}</span></div>
            ))}
            <span data-source="S3 · Drive VAULT" className="font-mono text-[11px] text-ink-3">S3 · Drive VAULT · structure de référence (non connecté)</span>
          </section>
          <Panel className="flex-[999_1_420px]">
            <PanelTitle aside={<Pill tone="mint">Git · source de vérité</Pill>}>Documentation du dépôt</PanelTitle>
            <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
              {REPO_DOCS.map((doc) => (
                <div key={doc.path} className="flex flex-col gap-1 rounded-[var(--radius-card)] border border-line-soft bg-surface-2 p-3">
                  <span className="font-mono text-xs font-medium">{doc.path}</span><span className="text-xs text-ink-3">{doc.what}</span>
                  <span className={cx("text-[11px] font-semibold", doc.owner === "A" ? "text-mint-ink" : doc.owner === "B" ? "text-lav-ink" : "text-ink-2")}>{doc.owner === "AB" ? "Mission A + B" : `Mission ${doc.owner}`}</span>
                </div>
              ))}
            </div>
            <h3 className="mt-2 text-sm font-bold">Registre ADR</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-[13px]">
                <thead><tr><Th>ADR</Th><Th>Sujet</Th><Th>Mission</Th><Th>Statut</Th></tr></thead>
                <tbody>{list.map((a) => (
                  <tr key={a.id} className="transition-colors hover:bg-surface-2">
                    <Td className="font-mono text-xs text-ink-2">{a.id}</Td><Td>{a.subject}</Td>
                    <Td><Pill tone={a.owner === "A" ? "mint" : a.owner === "B" ? "lavender" : "amber"}>{a.owner === "H" ? "Humains" : `Mission ${a.owner}`}</Pill></Td>
                    <Td><Pill tone={a.status === "ACCEPTED" ? "mint" : a.status === "OPEN" ? "amber" : a.status === "REJECTED" ? "red" : "neutral"}>{({ PROPOSED: "Proposée", ACCEPTED: "Acceptée", REJECTED: "Rejetée", SUPERSEDED: "Remplacée", OPEN: "Ouverte", NOT_WRITTEN: "À rédiger" } as const)[a.status]}</Pill></Td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <span className="flex flex-wrap justify-between gap-2 text-xs text-ink-3"><span>{written} rédigée(s) sur {list.length}</span><SourceNote s={adrs} /></span>
          </Panel>
        </div>
      );
    }
    case "security":
      return (
        <>
          <div className="flex flex-wrap items-stretch gap-3.5">
            <Panel className="flex-[999_1_460px]">
              <PanelTitle aside={<button type="button" className="h-9 rounded-xl bg-accent px-3.5 text-[13px] font-semibold text-white hover:bg-accent-hover">Déclarer un incident</button>}>Incidents</PanelTitle>
              <div className="grid min-h-[150px] flex-1 place-items-center rounded-2xl border-[1.5px] border-dashed border-[#dcd5cb] p-5 text-center">
                <span className="flex flex-col items-center gap-1.5"><ShieldCheck size={34} className="text-accent" aria-hidden /><span className="font-semibold">Aucun incident enregistré</span><span className="max-w-md text-xs text-ink-3">Chaque incident porte : identifiant, détection, service, gravité, état, responsable, actions, résolution.</span><span data-source="S8 · admin.incidents" className="font-mono text-[11px] text-ink-3">S8 · admin.incidents (non connecté)</span></span>
              </div>
              <div className="flex flex-wrap gap-2">{SEVERITIES.map((s) => <Pill key={s.label} tone={s.tone} className="px-3 py-1 text-xs">{s.label}</Pill>)}</div>
            </Panel>
            <Panel tone="soft" className="flex-[1_1_280px]">
              <PanelTitle>Interdits par défaut</PanelTitle>
              <ul className="flex flex-col gap-2">{FORBIDDEN.map((f) => <li key={f} className="flex gap-2 text-[13px]"><Ban size={16} className="mt-0.5 shrink-0 text-coral-ink" aria-hidden />{f}</li>)}</ul>
            </Panel>
          </div>
          <Panel>
            <PanelTitle aside="Appliquées côté serveur · ADMIN_PERMISSIONS · ADR-0012">Permissions administrateurs</PanelTitle>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-[13px]">
                <thead><tr><Th>Rôle</Th><Th>Niveau 1 · Consultation</Th><Th>Niveau 2 · Opérations</Th><Th>Niveau 3 · Sensible</Th></tr></thead>
                <tbody>{PERMISSIONS.map((r) => (
                  <tr key={r.role} className="transition-colors hover:bg-surface-2"><th scope="row" className="border-b border-[#f4f0ea] px-2 py-2.5 text-left font-semibold">{r.role}</th>{r.levels.map((c, i) => <Td key={i}><Pill tone={c.tone} className="px-2.5 py-1 text-xs">{c.label}</Pill></Td>)}</tr>
                ))}</tbody>
              </table>
            </div>
          </Panel>
        </>
      );
  }
}

export const dynamicParams = false;
