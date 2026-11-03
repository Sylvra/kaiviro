import { PEOPLE } from "@/lib/data/plan";
import { getBranches, getDeliverables } from "@/lib/queries";
import { OWNER_TONE, TONE } from "@/components/tone";
import { Avatar, Pill, SourceNote, cx } from "@/components/ui";

export const metadata = { title: "Équipe" };

export default async function Page() {
  const [deliv, branches] = await Promise.all([getDeliverables(), getBranches()]);
  const d = deliv.value ?? [];
  const known = new Set((branches.value ?? []).map((b) => b.name));

  return (
    <section aria-label="Équipe" className="grid gap-3.5 px-6 pb-6 pt-4 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
      {PEOPLE.map((p) => {
        const tone = OWNER_TONE[p.mission];
        const mine = d.filter((x) => x.owner === p.mission);
        const done = mine.filter((x) => x.status === 3).length;
        const pct = p.kind === "human" && mine.length ? Math.round((done / mine.length) * 100) : 0;
        const agent = p.kind === "agent";
        const branchExists = !agent && known.has(p.branch);
        return (
          <article key={p.id} className={cx("flex flex-col gap-3.5 rounded-[var(--radius-panel)] border p-5", agent ? "border-line bg-[#f7f5f1]" : tone === "mint" ? "border-[#d3eee3] bg-[#eaf7f2]" : "border-[#e3ddfa] bg-[#f2effd]")}>
            <div className="flex items-center gap-3">
              <Avatar initials={p.initials} tone={agent ? "dark" : tone} size={48} square={agent} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <h2 className="text-[17px] font-bold">{p.name}</h2>
                <span className="text-xs text-ink-3">{p.role}</span>
              </div>
              <Pill tone={agent ? "amber" : "neutral"}>{agent ? "En attente du prompt" : "Présence : inconnue"}</Pill>
            </div>
            <span className="flex flex-wrap items-center gap-2">
              <span className="rounded-[9px] bg-white/75 px-2.5 py-1.5 font-mono text-[11px] text-ink-2">{p.branch}</span>
              {!agent && <Pill tone={branchExists ? "mint" : "neutral"}>{branchExists ? "branche présente" : "branche non vérifiée"}</Pill>}
            </span>
            <ul className="flex flex-wrap gap-1.5">{p.scope.map((s) => <li key={s} className="rounded-full bg-white/80 px-2.5 py-1 text-xs text-ink-2">{s}</li>)}</ul>
            <div className="flex flex-col gap-1.5">
              <span className="flex justify-between text-xs"><span className="text-ink-3">Livrables M0</span><span className="font-mono">{agent ? "prompt non lancé" : `${done} / ${mine.length}`}</span></span>
              <span className="block h-2 overflow-hidden rounded-full bg-white/85"><span className={cx("block h-full rounded-full", TONE[tone].dot)} style={{ width: `${pct}%` }} /></span>
            </div>
          </article>
        );
      })}
      <div className="col-span-full flex justify-end gap-4"><SourceNote s={deliv} /><SourceNote s={branches} /></div>
    </section>
  );
}
