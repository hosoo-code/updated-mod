import { listGroupsAdmin } from "@/lib/repo";
import { GroupsAdmin } from "./groups-admin";

export const dynamic = "force-dynamic";

export default async function AdminGroupsPage() {
  let groups: Awaited<ReturnType<typeof listGroupsAdmin>> = [];
  try {
    groups = await listGroupsAdmin();
  } catch (err) {
    console.error("[AdminGroupsPage] Data fetch failed:", err);
  }
  return <GroupsAdmin groups={groups} />;
}
