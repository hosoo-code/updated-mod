import { withApi, readJson } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { err, ok } from "@/lib/security";
import { createAccount, listAccountsAdmin } from "@/lib/repo";
import { accountSchema } from "@/lib/validation";

export const GET = withApi(async () => {
  await requireAdmin();
  return ok(await listAccountsAdmin());
});

export const POST = withApi(async (req) => {
  const admin = await requireAdmin();
  const body = await readJson<unknown>(req);
  const parsed = accountSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Мэдээлэл буруу байна", 400);

  const d = parsed.data;
  await createAccount(
    {
      bankName: d.bankName,
      accountHolder: d.accountHolder,
      accountNumber: d.accountNumber,
      note: d.note || undefined,
      isActive: d.isActive,
    },
    admin.fullName ?? "admin"
  );
  return ok(null, { status: 201 });
});
