import { NextRequest } from "next/server";
import { withApi } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo-mode";
import { err, ok } from "@/lib/security";
import { getVerificationById } from "@/lib/repo";
import type { DocumentType } from "@/types";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/verifications/[id]/analyze
 * Server тал binary-г шалгуулна. Client-ийн faceResult-д итгэж decision гаргахгүй.
 */
export const POST = withApi(async (_req: NextRequest, { params }: Params) => {
  const user = await requireUser();
  const { id } = await params;
  const request = await getVerificationById(id);
  if (!request) return err("Хүсэлт олдсонгүй.", 404);
  if (request.userId !== user.id) return err("Энэ хүсэлтэд хандах эрхгүй байна.", 403);
  if (!["draft", "resubmit_requested"].includes(request.status)) {
    return err("Энэ хүсэлтэд шинжилгээ хийх боломжгүй төлөвт байна.", 400);
  }

  const documentTypes: DocumentType[] = ["id-card", "birth-certificate", "face"];
  const documents = request.documents.filter((doc) => documentTypes.includes(doc.documentType));
  if (documents.length === 0) return err("Шинжлэх баримт олдсонгүй.", 400);

  // Analysis нь browser capture-аас ирсэн advisory evidence болон admin review-д
  // зориулагдана. Python detector шаарддаггүй тул энд ямар ч автомат pass гаргахгүй.
  return ok({
    status: "review",
    reason: isDemoMode()
      ? "Demo mode — browser capture хадгалагдсан, admin review шаардлагатай."
      : "Server detector идэвхгүй — admin review шаардлагатай.",
    documents: documents.map((document) => ({
      documentType: document.documentType,
      status: document.status,
    })),
  });
});
