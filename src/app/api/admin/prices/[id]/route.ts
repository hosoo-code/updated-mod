import { NextRequest } from "next/server";
import { withApi, readJson } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { err, ok } from "@/lib/security";
import { deletePrice, reorderPrice, updatePrice } from "@/lib/repo";
import { priceSchema } from "@/lib/validation";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const patchSchema = priceSchema.partial().extend({ reorder: z.enum(["up", "down"]).optional() });

export const PATCH = withApi(async (req: NextRequest, { params }: Params) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const body = await readJson<unknown>(req);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Мэдээлэл буруу байна", 400);

  if (parsed.data.reorder) {
    await reorderPrice(id, parsed.data.reorder);
    return ok(null);
  }
  await updatePrice(id, parsed.data, admin.fullName ?? "admin");
  return ok(null);
});

export const DELETE = withApi(async (_req: NextRequest, { params }: Params) => {
  const admin = await requireAdmin();
  const { id } = await params;
  await deletePrice(id, admin.fullName ?? "admin");
  return ok(null);
});
