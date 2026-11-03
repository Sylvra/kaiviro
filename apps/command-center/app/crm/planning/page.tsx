import { Gantt } from "@/components/Gantt";
import { getDeliverables } from "@/lib/queries";

export const metadata = { title: "Planning" };

export default async function Page() {
  const d = await getDeliverables();
  return <Gantt items={d.value ?? []} />;
}
