import { listPricesAdmin } from "@/lib/repo";
import { PricesAdmin } from "./prices-admin";

export const dynamic = "force-dynamic";

export default async function AdminPricesPage() {
  let prices: Awaited<ReturnType<typeof listPricesAdmin>> = [];
  try {
    prices = await listPricesAdmin();
  } catch (err) {
    console.error("[AdminPricesPage] Data fetch failed:", err);
  }
  return <PricesAdmin prices={prices} />;
}
