import Link from "next/link";
import { ArrowUpRight, GitPullRequest } from "lucide-react";
import { MILESTONES, PEOPLE, STATUS_LABELS, type Deliverable } from "@/lib/data/plan";
import { agentState, getBranchActivity, getDecisions, getDeliverables, getOpenPullCount, getPartners, getPlanDay } from "@/lib/queries";
import { countByStatus, planSlice } from "@/lib/overview";
import { phaseLabel, todayInParis } from "@/lib/plan-day";
import { dueState, followUps } from "@/lib/partners";
import { OWNER_LABEL, OWNER_TONE } from "@/components/tone";
import { Panel, PanelTitle, Pill, SourceNote, cx } from "@/components/ui";

export const metadata = { title: "Vue d’ensemble" };
export const dynamic = "force-dynamic";

const dayLabel = (d: [number, number]) => (d[0] === d[1] ? `J${d[0]}` : `J${d[0]}–J${d[1]}`);

function Row({ d }: { d: Deliverable }) {
  const inner = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[13px] font-semibold">{d.title}</span>
        <span className="truncate text-xs text-ink-3">{STATUS_LABELS[d.status]} · {dayLabel(d.days)} · {d.kind}</span>
      </span>
      <Pill tone={OWNER_TONE[d.owner]}>{OWNER_LABEL[d.owner]}</Pill>
      {d.url && <ArrowUpRight size={14} className="shrink-0 text-ink-3" aria-hidden />}
    </>
  );
  const cls = "flex items-center gap-2.5 rounded-[12px] px-3 py-2.5 hover:bg-surface-2";
  return <li>{d.url ? <a href={d.url} target="_blank" rel="noreferrer" className={cls}>{inner}</a> : <Link href="/crm/tableau" className={cls}>{inner}</Link>}</li>;
}

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "coral" | "mint" | "amber" }) {
  return (
    <div className={cx("flex flex-col gap-1 rounded-[16px] border p-4", tone === "coral" ? "border-[#f6d2c1] bg-coral-bg" : tone === "amber" ? "border-[#f3e2b3] bg-[#fff6de]" : tone === "mint" ? "border-[#d3eee3] bg-[#eaf7f2]" : "border-line bg-surface-2")}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">{label}</span>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      {hint && <span className="text-xs text-ink-3">{hint}</span>}
    </div>
  );
}

export default async function Page() {
  const [deliv, decisions, planDay, pulls, activity, partners] = await Promise.all([
    getDeliverables(), getDecisions(), getPlanDay(), getOpenPullCount(), getBranchActivity(PEOPLE.map((p) => p.branch)), getPartners(),
  ]);
  const today = todayInParis();
  const relances = followUps(partners.value ?? [], today);
  const relanceRows = [...relances.overdue, ...relances.today, ...relances.soon];
  const items = deliv.value ?? [];
  const [todo, doing, review, done] = countByStatus(items);
  const day = planDay.value;
  const slice = planSlice(items, day && !day.over ? day.current : day?.over ? day.total + day.overBy : null);
  const openDecisions = (decisions.value ?? []).filter((x) => !x.resolved);
  const missions = [...new Set(PEOPLE.filter((p) => p.kind === "agent").map((p) => p.branch))];

  return (
    <section aria-label="Vue d’ensemble" className="flex flex-col gap-4 px-6 pb-6 pt-4">
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        <Kpi label="Avancement M0" value={`${done} / ${items.length}`} hint={`${todo} à faire · ${doing} en cours`} tone="mint" />
        <Kpi label="En revue" value={String(review)} hint="à relire et fusionner" />
        <Kpi label="En retard" value={day ? String(slice.late.length) : "—"} hint="fenêtre du plan passée" tone={slice.late.length ? "coral" : undefined} />
        <Kpi label="Jour du plan" value={day ? (day.current === 0 ? "J0" : `J${day.current}`) : "—"} hint={phaseLabel(day, MILESTONES)} />
        <Kpi label="Décisions ouvertes" value={String(openDecisions.length)} hint="à trancher" tone={openDecisions.length ? "amber" : undefined} />
        <Kpi label="PR ouvertes" value={pulls.value === null ? "—" : String(pulls.value)} hint={pulls.value === null ? "GitHub non connecté" : "vers develop"} />
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        <Panel>
          <PanelTitle aside={slice.milestone ? <Pill tone="lavender">{slice.milestone.inDays === 0 ? slice.milestone.label : `${slice.milestone.label} dans ${slice.milestone.inDays} j`}</Pill> : undefined}>
            Le plan aujourd’hui{day ? ` · J${day.current}` : ""}
          </PanelTitle>
          {!day && <p className="px-3 text-[13px] text-ink-3">Jour du plan inconnu : rien n’est déduit.</p>}
          {day && (
            <div className="flex flex-col gap-3">
              {slice.late.length > 0 && (
                <div>
                  <h3 className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-coral-ink">En retard · {slice.late.length}</h3>
                  <ul className="flex flex-col">{slice.late.map((d) => <Row key={d.id} d={d} />)}</ul>
                </div>
              )}
              <div>
                <h3 className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">Prévu aujourd’hui · {slice.today.length}</h3>
                {slice.today.length ? <ul className="flex flex-col">{slice.today.map((d) => <Row key={d.id} d={d} />)}</ul> : <p className="px-3 text-[13px] text-ink-3">Rien d’ouvert prévu aujourd’hui.</p>}
              </div>
              {slice.next.length > 0 && (
                <div>
                  <h3 className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">Ensuite · J{slice.next[0]!.days[0]}</h3>
                  <ul className="flex flex-col">{slice.next.map((d) => <Row key={d.id} d={d} />)}</ul>
                </div>
              )}
            </div>
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel>
            <PanelTitle aside={<Link href="/crm/partenaires" className="text-xs font-semibold text-accent hover:underline">Partenaires</Link>}>Relances partenaires</PanelTitle>
            {partners.value === null && <p className="px-3 text-[13px] text-coral-ink">Fichier local des partenaires illisible.</p>}
            {partners.value !== null && relanceRows.length === 0 && <p className="px-3 text-[13px] text-ink-3">Aucune relance en retard ni dans les 7 prochains jours.</p>}
            {relanceRows.length > 0 && (
              <ul className="flex flex-col">
                {relanceRows.map((p) => {
                  const s = dueState(p.due, today);
                  return (
                    <li key={p.id}>
                      <Link href={`/crm/partenaires?p=${encodeURIComponent(p.id)}`} className="flex items-center gap-2.5 rounded-[12px] px-3 py-2.5 hover:bg-surface-2">
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5"><span className="truncate text-[13px] font-semibold">{p.name}</span><span className="truncate text-xs text-ink-3">{p.ref} · {p.next || "Prochaine action non précisée"}</span></span>
                        <Pill tone={s === "overdue" ? "coral" : s === "today" ? "amber" : "neutral"}>{s === "overdue" ? "En retard" : s === "today" ? "Aujourd’hui" : new Date(`${p.due}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" })}</Pill>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelTitle aside={<Link href="/crm/decisions" className="text-xs font-semibold text-accent hover:underline">Tout voir</Link>}>Décisions à trancher</PanelTitle>
            {openDecisions.length === 0 ? <p className="px-3 text-[13px] text-ink-3">Aucune décision ouverte.</p> : (
              <ul className="flex flex-col">
                {openDecisions.map((x) => (
                  <li key={x.key}>
                    <Link href={`/crm/decisions?d=${encodeURIComponent(x.key)}`} className="flex items-center gap-2.5 rounded-[12px] px-3 py-2.5 hover:bg-surface-2">
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5"><span className="truncate text-[13px] font-semibold">{x.title}</span><span className="truncate text-xs text-ink-3">{x.ref} · {x.summary}</span></span>
                      <Pill tone={OWNER_TONE[x.owner]}>{OWNER_LABEL[x.owner]}</Pill>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelTitle aside={<Link href="/crm/equipe" className="text-xs font-semibold text-accent hover:underline">Équipe</Link>}>Branches de mission</PanelTitle>
            <ul className="flex flex-col gap-1">
              {missions.map((b) => {
                const a = activity.value?.[b];
                const s = agentState(a);
                return (
                  <li key={b} className="flex items-center gap-2.5 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate font-mono text-xs">{b}</span>
                    {a?.pull ? (
                      <a href={a.pull.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"><GitPullRequest size={13} aria-hidden />PR #{a.pull.number}</a>
                    ) : (
                      <Pill tone={s === "working" ? "lavender" : s === "empty" ? "amber" : "neutral"}>
                        {s === "not-started" ? "Pas lancée" : s === "empty" ? "Sans commit" : s === "working" ? `${a?.aheadBy} commits` : "Inconnue"}
                      </Pill>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-4"><SourceNote s={deliv} /><SourceNote s={planDay} /><SourceNote s={activity} /></div>
    </section>
  );
}
