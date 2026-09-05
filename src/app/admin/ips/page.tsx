import { listIpsAdmin } from "@/lib/repo";
import { IpsAdmin } from "./ips-admin";

export const dynamic = "force-dynamic";

export default async function AdminIpsPage() {
  const ips = await listIpsAdmin();
  return <IpsAdmin ips={ips} />;
}
