import { Partners } from "@/components/Partners";
import { SourceNote } from "@/components/ui";
import { getPartners } from "@/lib/queries";

export const metadata = { title: "Partenaires" };
// Fichier local relu à chaque affichage.
export const dynamic = "force-dynamic";

export default async function Page() {
  const p = await getPartners();
  return (
    <>
      <Partners initial={p.value ?? []} available={p.value !== null} />
      <div className="flex justify-end px-6 pb-5"><SourceNote s={p} /></div>
    </>
  );
}
