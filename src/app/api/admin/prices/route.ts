import { withApi, readJson } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { err, ok } from "@/lib/security";
import { createPrice, listPricesAdmin } from "@/lib/repo";
import { priceSchema } from "@/lib/validation";

export const GET = withApi(async () => {
  await requireAdmin();
  return ok(await listPricesAdmin());
});

export const POST = withApi(async (req) => {
  const admin = await requireAdmin();
  const body = await readJson<unknown>(req);
  const parsed = priceSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Мэдээлэл буруу байна", 400);

  const d = parsed.data;
  await createPrice(
    {
      title: d.title,
      durationMonths: d.durationMonths,
      price: d.price,
      description: d.description || undefined,
      isActive: d.isActive,
    },
    admin.fullName ?? "admin"
  );
  return ok(null, { status: 201 });
});
