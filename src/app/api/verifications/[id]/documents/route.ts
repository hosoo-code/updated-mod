import { NextRequest } from "next/server";
import { withApi, readJson } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";
import { err, ok } from "@/lib/security";
import { addVerificationDocument, getVerificationById } from "@/lib/repo";
import { documentRegisterSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/verifications/[id]/documents
 * R2 upload дууссаны дараа metadata бүртгэнэ (binary БИШ).
 */
export const POST = withApi(async (req: NextRequest, { params }: Params) => {
  const user = await requireUser();
  const { id } = await params;
  const request = await getVerificationById(id);
  if (!request) return err("Хүсэлт олдсонгүй.", 404);
  if (request.userId !== user.id) return err("Энэ хүсэлтэд хандах эрхгүй байна.", 403);
  if (request.status !== "draft" && request.status !== "resubmit_requested") {
    return err("Энэ хүсэлт засварлах боломжгүй төлөвт байна.", 400);
  }

  const body = await readJson<unknown>(req);
  const parsed = documentRegisterSchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Мэдээлэл буруу байна", 400);

  const doc = await addVerificationDocument(id, {
    documentType: parsed.data.documentType,
    objectKey: parsed.data.objectKey,
    fileSize: parsed.data.fileSize,
    contentType: parsed.data.contentType,
    faceResult: parsed.data.faceResult ?? null,
  });
  if (!doc) return err("Баримт бүртгэхэд алдаа гарлаа.", 500);
  return ok(doc, { status: 201 });
});
