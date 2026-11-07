import { sourced } from "@/lib/api/respond";
import { getAdrs } from "@/lib/queries";

export async function GET() {
  return sourced(await getAdrs());
}
