import { Board } from "@/components/Board";
import { getDeliverables } from "@/lib/queries";

export const metadata = { title: "Tableau" };
// Statuts modifiables depuis le tableau : toujours relus dans GitHub.
export const dynamic = "force-dynamic";

export default async function Page() {
  const d = await getDeliverables();
  return <Board items={d.value ?? []} freshness={d.freshness} />;
}
