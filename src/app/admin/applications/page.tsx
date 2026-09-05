import { listApplicationsAdmin } from "@/lib/repo";
import { ApplicationsAdmin } from "./applications-admin";

export const dynamic = "force-dynamic";

export default async function AdminApplicationsPage() {
  const applications = await listApplicationsAdmin();
  return <ApplicationsAdmin applications={applications} />;
}
