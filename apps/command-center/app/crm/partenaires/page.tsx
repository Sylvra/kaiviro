import { Partners } from "@/components/Partners";
import { SourceNote } from "@/components/ui";
import { getPartners } from "@/lib/queries";

export const metadata = { title: "Partenaires" };

export default async function Page() {
  const p = await getPartners();
  return (
    <>
      <Partners initial={p.value ?? []} demo={p.demo} />
      <div className="flex justify-end px-6 pb-5"><SourceNote s={p} /></div>
    </>
  );
}
