import { getSettings } from "@/lib/repo";
import { SettingsAdmin } from "./settings-admin";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  return <SettingsAdmin settings={settings} />;
}
