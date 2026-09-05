import { NextRequest } from "next/server";
import { withApi, readJson } from "@/lib/api-helpers";
import { requireAdmin } from "@/lib/auth";
import { err, ok } from "@/lib/security";
import { deleteGroup, reorderGroup, updateGroup } from "@/lib/repo";
import { groupSchema } from "@/lib/validation";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const patchSchema = groupSchema.partial().extend({
  isHidden: z.boolean().optional(),
  reorder: z.enum(["up", "down"]).optional(),
});

export const PATCH = withApi(async (req: NextRequest, { params }: Params) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const body = await readJson<unknown>(req);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Мэдээлэл буруу байна", 400);

  if (parsed.data.reorder) {
    await reorderGroup(id, parsed.data.reorder);
    return ok(null);
  }

  await updateGroup(id, parsed.data, admin.fullName ?? "admin");
  return ok(null);
});

export const DELETE = withApi(async (_req: NextRequest, { params }: Params) => {
  const admin = await requireAdmin();
  const { id } = await params;
  await deleteGroup(id, admin.fullName ?? "admin");
  return ok(null);
});
