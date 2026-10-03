import { listIpsAdmin } from "@/lib/repo";
import { IpsAdmin } from "./ips-admin";

export const dynamic = "force-dynamic";

export default async function AdminIpsPage() {
  let ips: Awaited<ReturnType<typeof listIpsAdmin>> = [];
  try {
    ips = await listIpsAdmin();
  } catch (err) {
    console.error("[AdminIpsPage] Data fetch failed:", err);
  }
  return <IpsAdmin ips={ips} />;
}
