import { Partners } from "@/components/Partners";
import { SourceNote } from "@/components/ui";
import { getPartners } from "@/lib/queries";
import { todayInParis } from "@/lib/plan-day";

export const metadata = { title: "Partenaires" };
// Fichier local relu à chaque affichage.
export const dynamic = "force-dynamic";

/** ?p=<id> ouvre directement une fiche (lien des relances de la vue d'ensemble). */
export default async function Page({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const [p, { p: focus }] = await Promise.all([getPartners(), searchParams]);
  return (
    <>
      <Partners key={focus ?? "all"} initial={p.value ?? []} available={p.value !== null} today={todayInParis()} focus={focus} />
      <div className="flex justify-end px-6 pb-5"><SourceNote s={p} /></div>
    </>
  );
}
