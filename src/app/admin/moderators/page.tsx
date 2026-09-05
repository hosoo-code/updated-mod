import { listAllModerators, listGroupsAdmin } from "@/lib/repo";
import { ModeratorsAdmin } from "./moderators-admin";

export const dynamic = "force-dynamic";

export default async function AdminModeratorsPage() {
  const [moderators, groups] = await Promise.all([listAllModerators(), listGroupsAdmin()]);
  return <ModeratorsAdmin moderators={moderators} groups={groups} />;
}
