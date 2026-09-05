import { listGroupsAdmin } from "@/lib/repo";
import { GroupsAdmin } from "./groups-admin";

export const dynamic = "force-dynamic";

export default async function AdminGroupsPage() {
  const groups = await listGroupsAdmin();
  return <GroupsAdmin groups={groups} />;
}
