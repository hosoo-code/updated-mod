import { listApplicationsAdmin } from "@/lib/repo";
import { ApplicationsAdmin } from "./applications-admin";

export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage() {
  let applications: Awaited<ReturnType<typeof listApplicationsAdmin>> = [];
  try {
    applications = await listApplicationsAdmin();
  } catch (err) {
    console.error("[AdminApplicationsPage] Data fetch failed:", err);
  }
  return <ApplicationsAdmin applications={applications} />;
}
