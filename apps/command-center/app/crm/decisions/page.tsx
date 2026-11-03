import { Decisions } from "@/components/Decisions";
import { SourceNote } from "@/components/ui";
import { getDecisions } from "@/lib/queries";

export const metadata = { title: "Décisions" };

export default async function Page() {
  const d = await getDecisions();
  return (
    <>
      <Decisions items={d.value ?? []} live={d.freshness === "live"} />
      <div className="flex justify-end px-6 pb-5"><SourceNote s={d} /></div>
    </>
  );
}
