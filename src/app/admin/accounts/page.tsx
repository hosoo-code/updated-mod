import { listAccountsAdmin } from "@/lib/repo";
import { AccountsAdmin } from "./accounts-admin";

export const dynamic = "force-dynamic";

export default async function AdminAccountsPage() {
  const accounts = await listAccountsAdmin();
  return <AccountsAdmin accounts={accounts} />;
}
