import { CrmTabs } from "@/components/CrmTabs";
import { NewDeliverable } from "@/components/NewDeliverable";
import { Avatar, Pill, SourceNote } from "@/components/ui";
import { getDecisions, getDeliverables, getPlanDay } from "@/lib/queries";
import { MILESTONES, PLAN_DAY } from "@/lib/data/plan";
import { phaseLabel } from "@/lib/plan-day";

const frDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const [deliv, decisions, planDay] = await Promise.all([getDeliverables(), getDecisions(), getPlanDay()]);
  const day = planDay.value;
  const phase = phaseLabel(day, MILESTONES);
  const dayTitle = day
    ? `Début le ${frDate(day.start)} (${planDay.source}). Jours ouvrés, hors week-ends et jours fériés nationaux.${day.over ? ` Dépassé de ${day.overBy} jour(s).` : ""}`
    : "Jour inconnu : renseigner PLAN_START dans .env.local ou connecter GitHub.";
  const d = deliv.value ?? [];
  const done = d.filter((x) => x.status === 3).length;
  const C = 100.53;
  const dash = d.length ? (C * done) / d.length : 0;

  return (
    <>
      <header className="flex flex-col gap-4 px-6 pt-5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid size-[46px] place-items-center rounded-[14px] border border-[#f6d2c1] bg-coral-bg">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A8432A" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M3 9h18M8 14h3M8 17h6" /></svg>
          </span>
          <div className="flex min-w-[240px] flex-1 flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-2 text-xs text-ink-3">Espaces <span aria-hidden>›</span> M0 · Fondations · J1 → J{PLAN_DAY.total} <Pill tone={day?.over ? "coral" : "mint"}>{phase}</Pill></span>
            <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em]">Command Center</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex h-[46px] items-center gap-2.5 rounded-[14px] border border-line bg-surface-2 pl-2 pr-3.5">
              <svg width="34" height="34" viewBox="0 0 40 40" role="img" aria-label={`Avancement M0 : ${done} livrables terminés sur ${d.length}`}>
                <circle cx="20" cy="20" r="16" fill="none" stroke="#EFE9E1" strokeWidth="5" />
                <circle cx="20" cy="20" r="16" fill="none" stroke="#E07A52" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${dash.toFixed(1)} ${C}`} transform="rotate(-90 20 20)" />
              </svg>
              <span className="flex flex-col leading-tight"><span className="text-[11px] text-ink-3">Avancement M0</span><span className="text-sm font-semibold tabular-nums">{done} / {d.length}</span></span>
            </div>
            <div title={dayTitle} data-source={planDay.source} className="flex h-[46px] items-center gap-2.5 rounded-[14px] border border-line bg-surface-2 px-3.5">
              <span className="flex flex-col leading-tight">
                <span className="text-[11px] text-ink-3">Jours{day ? ` · depuis le ${frDate(day.start)}` : ""}</span>
                <span className="text-sm font-semibold">{day ? (day.current === 0 ? "Pas commencé" : `J${day.current} sur ${day.total}${day.over ? ` · +${day.overBy}` : ""}`) : "—"}</span>
              </span>
              <span aria-hidden className="grid grid-cols-5 gap-[3px]">{Array.from({ length: PLAN_DAY.total }, (_, i) => <span key={i} className={`size-[7px] rounded-[2px] ${day && i < day.current ? "bg-coral-dot" : "bg-[#e5dfd6]"}`} />)}</span>
            </div>
            <div className="flex items-center">
              <Avatar initials="JB" tone="mint" size={34} title="Johan — Mission A" />
              <span className="-ml-2"><Avatar initials="B" tone="lavender" size={34} title="Collègue — Mission B" /></span>
              <span className="-ml-2"><Avatar initials="+2" tone="dark" size={34} title="Deux instances Claude Code" /></span>
            </div>
            <NewDeliverable live={deliv.freshness === "live"} />
          </div>
        </div>
        <div className="flex justify-end"><SourceNote s={deliv} /></div>
        <CrmTabs decisionsOpen={(decisions.value ?? []).filter((x) => !x.resolved).length} />
      </header>
      {children}
    </>
  );
}
