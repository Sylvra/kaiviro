import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { getDecisions, getDeliverables, getPartners, getPlanDay } from "@/lib/queries";
import { getSourceStatuses } from "@/lib/sources/registry";
import { followUps } from "@/lib/partners";
import { todayInParis } from "@/lib/plan-day";

export const metadata: Metadata = {
  title: { default: "KAIVIRO — Command Center", template: "%s · KAIVIRO" },
  description: "Command Center privé des administrateurs KAIVIRO.",
  robots: { index: false, follow: false },
};

export const revalidate = 60;

const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [deliv, decisions, sources, planDay, partners] = await Promise.all([getDeliverables(), getDecisions(), getSourceStatuses(), getPlanDay(), getPartners()]);
  const day = planDay.value;
  const partnersTotal = partners.value?.length ?? 0;
  const partnersActive = partners.value?.filter((p) => p.stage === 2).length ?? 0;
  const d = deliv.value ?? [];
  const of = (o: string) => d.filter((x) => x.owner === o);
  const done = (xs: typeof d) => xs.filter((x) => x.status === 3).length;

  const counts = {
    myOpen: of("A").filter((x) => x.status !== 3).length,
    decisionsOpen: (decisions.value ?? []).filter((x) => !x.resolved).length,
    followUpsDue: (() => { const f = followUps(partners.value ?? [], todayInParis()); return f.overdue.length + f.today.length; })(),
    day: day ? (day.current === 0 ? "J0" : `J${day.current}`) : "J?",
    spaces: [
      { name: "Fondations M0", href: "/crm/tableau", pct: pct(done(d), d.length), meta: `${d.length} livrables · 2 missions`, dot: "bg-coral-dot" },
      { name: "Command Center", href: "/crm/equipe", pct: pct(done(of("A")), of("A").length), meta: "Mission A · Johan", dot: "bg-mint-dot" },
      { name: "App mobile", href: "/crm/planning", pct: pct(done(of("B")), of("B").length), meta: "Mission B · collègue", dot: "bg-lav-dot" },
      { name: "Partenaires", href: "/crm/partenaires", pct: pct(partnersActive, partnersTotal), meta: partners.value === null ? "fichier local illisible" : `${partnersTotal} fiche${partnersTotal > 1 ? "s" : ""} · ${partnersActive} actif${partnersActive > 1 ? "s" : ""}`, dot: "bg-amber-dot" },
    ],
    sourcesConnected: sources.filter((s) => s.connected).length,
    sourcesTotal: sources.length,
  };

  return (
    <html lang="fr">
      <body className="min-h-dvh bg-canvas p-3.5">
        <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">Aller au contenu</a>
        <div className="flex min-h-[calc(100dvh-28px)] flex-wrap items-stretch gap-3.5">
          <Sidebar counts={counts} />
          <main id="contenu" className="flex min-w-0 flex-[999_1_640px] flex-col rounded-[var(--radius-shell)] border border-line bg-surface shadow-[var(--shadow-shell)]">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
