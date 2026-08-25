import { listPricesAdmin } from "@/lib/repo";
import { PricesAdmin } from "./prices-admin";

export const dynamic = "force-dynamic";

export default async function AdminPricesPage() {
  const prices = await listPricesAdmin();
  return <PricesAdmin prices={prices} />;
}
