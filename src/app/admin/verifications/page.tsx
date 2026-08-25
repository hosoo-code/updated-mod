import { listVerificationsAdmin } from "@/lib/repo";
import { VerificationsAdmin } from "./verifications-admin";

export const dynamic = "force-dynamic";

export default async function AdminVerificationsPage() {
  const verifications = await listVerificationsAdmin();
  return <VerificationsAdmin verifications={verifications} />;
}
