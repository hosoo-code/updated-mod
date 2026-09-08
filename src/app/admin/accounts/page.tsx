import { listAccountsAdmin } from "@/lib/repo";
import { AccountsAdmin } from "./accounts-admin";

export const dynamic = "force-dynamic";

export default async function AdminAccountsPage() {
  let accounts: Awaited<ReturnType<typeof listAccountsAdmin>> = [];
  try {
    accounts = await listAccountsAdmin();
  } catch (err) {
    console.error("[AdminAccountsPage] Data fetch failed:", err);
  }
  return <AccountsAdmin accounts={accounts} />;
}
