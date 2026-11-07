import { ExternalLink, GitCommitHorizontal, GitPullRequest } from "lucide-react";
import { PEOPLE } from "@/lib/data/plan";
import { agentState, getBranchActivity, getDeliverables, type AgentState } from "@/lib/queries";
import { OWNER_TONE, TONE } from "@/components/tone";
import { Avatar, Pill, SourceNote, cx } from "@/components/ui";

export const metadata = { title: "Équipe" };
// Activité des branches relue à chaque affichage (cache GitHub de 2 minutes côté source).
export const dynamic = "force-dynamic";

const AGENT: Record<AgentState, { label: string; tone: "mint" | "amber" | "neutral" | "lavender" }> = {
  "pr-open": { label: "PR ouverte", tone: "mint" },
  working: { label: "Commits en cours", tone: "lavender" },
  empty: { label: "Branche sans commit", tone: "amber" },
  "not-started": { label: "Pas lancé", tone: "neutral" },
  unknown: { label: "État inconnu", tone: "neutral" },
};

const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
function ago(iso: string): string {
  const s = (Date.parse(iso) - Date.now()) / 1000;
  if (Number.isNaN(s)) return "date inconnue";
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [[60, "second"], [60, "minute"], [24, "hour"], [7, "day"], [4.35, "week"], [12, "month"], [Infinity, "year"]];
  let v = s;
  for (const [n, unit] of steps) {
    if (Math.abs(v) < n) return rtf.format(Math.round(v), unit);
    v /= n;
  }
  return rtf.format(Math.round(v), "year");
}

export default async function Page() {
  const [deliv, activity] = await Promise.all([getDeliverables(), getBranchActivity(PEOPLE.map((p) => p.branch))]);
  const d = deliv.value ?? [];

  return (
    <section aria-label="Équipe" className="grid gap-3.5 px-6 pb-6 pt-4 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
      {PEOPLE.map((p) => {
        const tone = OWNER_TONE[p.mission];
        const agent = p.kind === "agent";
        const a = activity.value?.[p.branch];
        const state = agentState(a);
        const mine = d.filter((x) => x.owner === p.mission);
        const done = mine.filter((x) => x.status === 3).length;
        const review = mine.filter((x) => x.status === 2).length;
        const pct = mine.length ? Math.round((done / mine.length) * 100) : 0;
        return (
          <article key={p.id} className={cx("flex flex-col gap-3.5 rounded-[var(--radius-panel)] border p-5", agent ? "border-line bg-[#f7f5f1]" : tone === "mint" ? "border-[#d3eee3] bg-[#eaf7f2]" : "border-[#e3ddfa] bg-[#f2effd]")}>
            <div className="flex items-center gap-3">
              <Avatar initials={p.initials} tone={agent ? "dark" : tone} size={48} square={agent} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <h2 className="text-[17px] font-bold">{p.name}</h2>
                <span className="text-xs text-ink-3">{p.role}</span>
              </div>
              {agent
                ? <Pill tone={AGENT[state].tone}>{state === "pr-open" && a?.pull ? `PR #${a.pull.number} ouverte` : AGENT[state].label}</Pill>
                : <span title="Aucune source de présence : on n’invente pas « en ligne »."><Pill tone="neutral">Présence : inconnue</Pill></span>}
            </div>

            <div className="flex flex-col gap-2 rounded-[14px] bg-white/70 p-3">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] text-ink-2">{p.branch}</span>
                {a ? (
                  <Pill tone={a.exists ? "mint" : "neutral"}>{a.exists ? (a.aheadBy === null ? "présente" : `${a.aheadBy} commit${a.aheadBy > 1 ? "s" : ""} d’avance`) : "pas sur GitHub"}</Pill>
                ) : <Pill tone="neutral">non vérifiée</Pill>}
              </span>
              {a?.lastCommit && a.aheadBy !== 0 && (
                <a href={a.lastCommit.url} target="_blank" rel="noreferrer" className="flex items-start gap-1.5 text-xs text-ink-2 hover:text-ink">
                  <GitCommitHorizontal size={14} className="mt-px shrink-0 text-ink-3" aria-hidden />
                  <span className="flex min-w-0 flex-1 flex-col"><span className="line-clamp-2">{a.lastCommit.message}</span><span className="text-ink-3">{ago(a.lastCommit.date)}</span></span>
                </a>
              )}
              {a?.pull && (
                <a href={a.pull.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline">
                  <GitPullRequest size={14} aria-hidden /> PR #{a.pull.number}{a.pull.draft ? " (brouillon)" : ""} vers develop <ExternalLink size={11} aria-hidden />
                </a>
              )}
              {a && !a.exists && <span className="text-xs text-ink-3">{agent ? "Le prompt de mission n’a pas encore produit de branche sur GitHub." : "Aucun travail poussé sur cette branche."}</span>}
            </div>

            <ul className="flex flex-wrap gap-1.5">{p.scope.map((s) => <li key={s} className="rounded-full bg-white/80 px-2.5 py-1 text-xs text-ink-2">{s}</li>)}</ul>
            {!agent && (
              <div className="flex flex-col gap-1.5">
                <span className="flex justify-between text-xs"><span className="text-ink-3">Livrables M0{review ? ` · ${review} en revue` : ""}</span><span className="font-mono">{done} / {mine.length}</span></span>
                <span className="block h-2 overflow-hidden rounded-full bg-white/85"><span className={cx("block h-full rounded-full", TONE[tone].dot)} style={{ width: `${pct}%` }} /></span>
              </div>
            )}
          </article>
        );
      })}
      <div className="col-span-full flex justify-end gap-4"><SourceNote s={deliv} /><SourceNote s={activity} /></div>
    </section>
  );
}
