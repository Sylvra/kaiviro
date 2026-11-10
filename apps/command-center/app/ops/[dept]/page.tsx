import { notFound } from "next/navigation";
import { Ban, CircleCheck, CircleDashed, CircleX, FolderClosed, GitBranch, LoaderCircle, ShieldCheck } from "lucide-react";
import { PiIcon } from "@/components/Board";
import { LiveInfra } from "@/components/LiveInfra";
import { TONE } from "@/components/tone";
import { Panel, PanelTitle, Pill, SourceNote, UnknownTile, cx } from "@/components/ui";
import {
  AGENTS, CLOUD, COMPAT_COLUMNS, DEPARTMENTS, EVAL_DIMENSIONS, FORBIDDEN, NETWORK,
  PERMISSIONS, PI_SPECS, REPO_DOCS, SEVERITIES, VAULT_FOLDERS, type DeptKey, type Tone,
} from "@/lib/data/ops";
import { getAdrs, getBranches, getCiRuns, getOpenPullCount } from "@/lib/queries";
import { getInfra } from "@/lib/sources/infra";
import { readAudit } from "@/lib/api/audit";
import { healthTiles, type HealthTile } from "@/lib/health";
import { hostHealth, type Health } from "@/lib/infra";
import type { RunState } from "@/lib/ci";
import { getSourceStatuses } from "@/lib/sources/registry";

/** Rendu à chaque requête : santé, CI et audit sont lus en direct. */
export const dynamic = "force-dynamic";

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
const STATE: Record<Health, { label: string; tone: Tone; card: string }> = {
  ok: { label: "OK", tone: "mint", card: "border-[#d3eee3] bg-[#eaf7f2]" },
  warn: { label: "À surveiller", tone: "amber", card: "border-[#f3e2b3] bg-[#fff6de]" },
  alert: { label: "Alerte", tone: "coral", card: "border-[#f5d3c6] bg-[#fdeee8]" },
  unknown: { label: "Inconnu", tone: "neutral", card: "border-line bg-surface-2" },
};

function HealthCard({ t }: { t: HealthTile }) {
  const st = STATE[t.state];
  return (
    <article className={cx("flex flex-col gap-2 rounded-[18px] border p-4", st.card)}>
      <div className="flex items-center justify-between gap-2"><span className="text-[13px] font-semibold">{t.label}</span><Pill tone={st.tone} dot={t.state !== "unknown"}>{st.label}</Pill></div>
      <span className={cx("font-display text-2xl font-bold leading-none", !t.live && "text-ghost")} aria-label={t.live ? undefined : "valeur inconnue"}>{t.value}</span>
      <span data-source={t.source} className="text-xs text-ink-3">Source : {t.source}</span>
      {!t.live && <span className="font-mono text-[11px] text-ink-3">jamais mesuré</span>}
    </article>
  );
}

const RUN: Record<RunState, { label: string; icon: typeof CircleCheck; cls: string }> = {
  success: { label: "réussie", icon: CircleCheck, cls: "text-mint-ink" },
  failure: { label: "en échec", icon: CircleX, cls: "text-coral-ink" },
  running: { label: "en cours", icon: LoaderCircle, cls: "text-sky-ink" },
  cancelled: { label: "annulée", icon: CircleDashed, cls: "text-ink-3" },
  other: { label: "autre", icon: CircleDashed, cls: "text-ink-3" },
};
const OUTCOME_TONE: Record<string, Tone> = { succeeded: "mint", requested: "sky", denied: "amber", failed: "coral" };
const when = (iso: string) => new Date(iso).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

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
      const [sources, infra, ci] = await Promise.all([getSourceStatuses(), getInfra(), getCiRuns()]);
      const tiles = healthTiles({ ...infra, ci });
      return (
        <>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
            {tiles.map((t) => <HealthCard key={t.label} t={t} />)}
          </div>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {[
              { label: "Dernier déploiement", value: "Aucun", note: "Aucun pipeline de déploiement en M0", src: "S1 · GitHub releases" },
              { label: "Incidents ouverts", value: "Registre absent", note: "Registre des incidents en CC-M3 : rien n’est compté avant", src: "S8 · admin.incidents" },
            ].map((c) => (
              <article key={c.label} className="flex flex-col gap-1.5 rounded-[18px] border border-line bg-surface-2 p-4">
                <span className="text-xs font-semibold text-ink-2">{c.label}</span>
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
    case "infrastructure": {
      const infra = await getInfra();
      const health = hostHealth(infra.host.value);
      return (
        <>
          <div className="flex flex-wrap items-start gap-3.5">
            <section className="flex min-w-0 flex-[999_1_520px] flex-col gap-4 rounded-[var(--radius-panel)] border border-[#d3eee3] bg-gradient-to-br from-[#eaf7f2] to-[#f6fbf9] p-5">
              <div className="flex flex-wrap items-center gap-3.5">
                <PiIcon size={52} />
                <div className="flex flex-1 flex-col gap-0.5"><h2 className="text-lg font-bold">Raspberry Pi 5 — centre d’administration</h2><span className="font-mono text-xs text-ink-2">{PI_SPECS}</span></div>
                <Pill tone={STATE[health].tone} dot={health !== "unknown"}>{health === "unknown" ? "Non supervisée" : STATE[health].label}</Pill>
              </div>
              <div className="rounded-2xl border border-[#e3f1eb] bg-white p-4"><LiveInfra initial={infra} /></div>
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
    }
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
      const [branches, pulls, ci] = await Promise.all([getBranches(), getOpenPullCount(), getCiRuns()]);
      const red = ci.value?.filter((r) => r.state === "failure").length ?? 0;
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
              <article className="flex flex-col gap-1.5 rounded-[18px] border border-line bg-surface-2 p-4"><span className="text-xs text-ink-3">CI</span><span className={cx("font-display text-2xl font-bold", ci.value === null ? "text-ghost" : red ? "text-coral-ink" : "text-mint-ink")}>{ci.value === null ? "—" : red ? `${red} en échec` : ci.value.length ? "verte" : "aucune"}</span><SourceNote s={ci} /></article>
              <article className="flex flex-col gap-1.5 rounded-[18px] border border-line bg-surface-2 p-4"><span className="text-xs text-ink-3">Dernière release</span><span className="font-display text-2xl font-bold">aucune</span><span data-source="S1 · GitHub releases" className="text-xs text-ink-2">cible : tag m0.1.0</span></article>
              <article className="flex flex-col gap-1.5 rounded-[18px] border border-line bg-surface-2 p-4"><span className="text-xs text-ink-3">Tickets M1</span><span className="font-display text-2xl font-bold text-ghost">—</span><span data-source="S1 · GitHub issues" className="text-xs text-ink-2">backlog en fin de M0</span></article>
            </div>
          </div>
          <Panel>
            <PanelTitle aside={<SourceNote s={ci} />}>Intégration continue · dernière exécution par workflow et branche</PanelTitle>
            {ci.value === null ? (
              <p className="text-[13px] text-ink-3">Inconnu : ajouter la permission « Actions : read » au jeton GitHub de <code className="font-mono text-xs">.env.local</code> pour lire les exécutions.</p>
            ) : ci.value.length === 0 ? <p className="text-[13px] text-ink-3">Aucune exécution trouvée.</p> : (
              <ul className="flex flex-col divide-y divide-line-soft">
                {ci.value.map((r) => {
                  const st = RUN[r.state];
                  return (
                    <li key={r.id}>
                      <a href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 rounded-[10px] px-2 py-2.5 text-[13px] transition-colors hover:bg-surface-2">
                        <st.icon size={16} className={cx("shrink-0", st.cls)} aria-label={st.label} />
                        <span className="font-semibold">{r.workflow}</span>
                        <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink-2">{r.branch}</span>
                        <span className="text-xs text-ink-3">{r.event}</span>
                        <span className="w-24 text-right text-xs tabular-nums text-ink-3">{when(r.startedAt)}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
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
    case "security": {
      const audit = await readAudit(100);
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
            <PanelTitle aside={<span className="font-mono text-[11px] text-ink-3">data/audit.jsonl · ajout seul{audit.skipped ? ` · ${audit.skipped} ligne(s) illisible(s)` : ""}</span>}>Journal d’audit · écritures N2 et N3</PanelTitle>
            {audit.lines.length === 0 ? (
              <p className="text-[13px] text-ink-3">{audit.exists ? "Journal vide." : "Aucune écriture journalisée pour l’instant : le fichier sera créé à la première action N2 ou N3."}</p>
            ) : (
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full min-w-[720px] border-collapse text-[13px]">
                  <thead className="sticky top-0 bg-white"><tr><Th>Quand</Th><Th>Action</Th><Th>Niveau</Th><Th>Ressource</Th><Th>Résultat</Th><Th>Motif</Th></tr></thead>
                  <tbody>{audit.lines.map((l) => (
                    <tr key={l.id} className="transition-colors hover:bg-surface-2">
                      <Td className="whitespace-nowrap font-mono text-xs text-ink-2">{when(l.at)}</Td>
                      <Td className="font-mono text-xs">{l.action}</Td>
                      <Td><Pill tone={l.level >= 3 ? "coral" : "sky"} className="font-mono">N{l.level}</Pill></Td>
                      <Td className="font-mono text-xs text-ink-2">{l.resource}</Td>
                      <Td><Pill tone={OUTCOME_TONE[l.outcome] ?? "neutral"}>{l.outcome}</Pill></Td>
                      <Td className="max-w-[260px] truncate text-xs text-ink-2">{l.reason ?? "—"}</Td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </Panel>
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
}

export const dynamicParams = false;
