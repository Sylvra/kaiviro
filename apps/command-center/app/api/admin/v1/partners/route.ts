import { sourced } from "@/lib/api/respond";
import { getPartners } from "@/lib/queries";

export async function GET() {
  return sourced(await getPartners());
}
