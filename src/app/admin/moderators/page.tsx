import { listAllModerators, listGroupsAdmin } from "@/lib/repo";
import { ModeratorsAdmin } from "./moderators-admin";

export const dynamic = "force-dynamic";

export default async function AdminModeratorsPage() {
  let moderators: Awaited<ReturnType<typeof listAllModerators>> = [];
  let groups: Awaited<ReturnType<typeof listGroupsAdmin>> = [];
  try {
    [moderators, groups] = await Promise.all([listAllModerators(), listGroupsAdmin()]);
  } catch (err) {
    console.error("[AdminModeratorsPage] Data fetch failed:", err);
  }
  return <ModeratorsAdmin moderators={moderators} groups={groups} />;
}
