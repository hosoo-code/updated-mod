import { listVerificationsAdmin } from "@/lib/repo";
import { VerificationsAdmin } from "./verifications-admin";

export const dynamic = "force-dynamic";

export default async function AdminVerificationsPage() {
  let verifications: Awaited<ReturnType<typeof listVerificationsAdmin>> = [];
  try {
    verifications = await listVerificationsAdmin();
  } catch (err) {
    console.error("[AdminVerificationsPage] Data fetch failed:", err);
  }
  return <VerificationsAdmin verifications={verifications} />;
}
