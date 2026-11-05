import { Gantt } from "@/components/Gantt";
import { getDeliverables, getPlanDay } from "@/lib/queries";

export const metadata = { title: "Planning" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const [d, day] = await Promise.all([getDeliverables(), getPlanDay()]);
  return <Gantt items={d.value ?? []} current={day.value?.current ?? null} />;
}
