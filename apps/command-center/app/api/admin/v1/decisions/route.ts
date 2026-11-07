import { sourced } from "@/lib/api/respond";
import { getDecisions } from "@/lib/queries";

export async function GET() {
  return sourced(await getDecisions());
}
