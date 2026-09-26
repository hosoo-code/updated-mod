import { NextRequest } from "next/server";
import { withApi, readJson } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";
import { err, ok } from "@/lib/security";
import { getVerificationById, submitVerification } from "@/lib/repo";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const submitSchema = z.object({
  locationStatus: z.enum(["none", "verified", "denied", "unavailable"]),
});

export const GET = withApi(async (_req, { params }: Params) => {
  const user = await requireUser();
  const { id } = await params;
  const request = await getVerificationById(id);
  if (!request) return err("Хүсэлт олдсонгүй.", 404);
  if (request.userId !== user.id) return err("Энэ хүсэлтэд хандах эрхгүй байна.", 403);
  return ok(request);
});

/** PATCH — хүсэлтээ admin хяналтад илгээх */
export const PATCH = withApi(async (req: NextRequest, { params }: Params) => {
  const user = await requireUser();
  const { id } = await params;
  const request = await getVerificationById(id);
  if (!request) return err("Хүсэлт олдсонгүй.", 404);
  if (request.userId !== user.id) return err("Энэ хүсэлтэд хандах эрхгүй байна.", 403);
  if (request.status !== "draft" && request.status !== "resubmit_requested") {
    return err("Энэ хүсэлт аль хэдийн илгээгдсэн байна.", 400);
  }

  const body = await readJson<unknown>(req);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) return err("Мэдээлэл буруу байна.", 400);

  // Шаардлагатай баримтууд байгаа эсэх
  const hasDocument = request.documents.some(
    (d) => d.documentType === request.documentType && d.status === "uploaded"
  );
  const hasFace = request.documents.some(
    (d) => d.documentType === "face" && d.status === "uploaded"
  );
  if (!hasDocument) return err("Баримтын зургаа оруулаагүй байна.", 400);
  if (!hasFace) return err("Нүүрний баталгаажуулалт хийгдээгүй байна.", 400);

  await submitVerification(id, { locationStatus: parsed.data.locationStatus });
  return ok({ id });
});
