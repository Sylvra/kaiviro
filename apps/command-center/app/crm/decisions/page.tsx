import { Decisions } from "@/components/Decisions";
import { SourceNote } from "@/components/ui";
import { getDecisions } from "@/lib/queries";

export const metadata = { title: "Décisions" };
export const dynamic = "force-dynamic";

/** ?d=gh-25 ouvre directement une décision (lien de la recherche globale). */
export default async function Page({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const [d, { d: initial }] = await Promise.all([getDecisions(), searchParams]);
  return (
    <>
      <Decisions key={initial ?? "all"} items={d.value ?? []} live={d.freshness === "live"} initial={initial} />
      <div className="flex justify-end px-6 pb-5"><SourceNote s={d} /></div>
    </>
  );
}
