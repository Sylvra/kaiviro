import { Board } from "@/components/Board";
import { getDeliverables } from "@/lib/queries";

export const metadata = { title: "Tableau" };

export default async function Page() {
  const d = await getDeliverables();
  return <Board items={d.value ?? []} freshness={d.freshness} />;
}
