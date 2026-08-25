"use client";

import type { FaceCheckResult } from "@/types";

/**
 * Client-side upload helper.
 * 1) Серверээс signed/presigned URL авна
 * 2) Blob-ийг шууд storage руу (R2) илгээнэ — binary серверээр дамжихгүй
 * 3) Баримтын metadata-г серверт бүртгүүлнэ
 */
export async function uploadVerificationImage(
  blob: Blob,
  requestId: string,
  documentType: "id-card" | "birth-certificate" | "face",
  faceResult?: FaceCheckResult | null
): Promise<string> {
  const urlRes = await fetch("/api/r2/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestId,
      documentType,
      contentType: blob.type || "image/jpeg",
      fileSize: blob.size,
    }),
  });
  const urlJson = await urlRes.json();
  if (!urlJson.ok) throw new Error(urlJson.error ?? "Upload URL авахад алдаа гарлаа.");

  const { objectKey, uploadUrl, method } = urlJson.data as {
    objectKey: string;
    uploadUrl: string;
    method: string;
  };

  const putRes = await fetch(uploadUrl, {
    method: method || "PUT",
    headers: { "Content-Type": blob.type || "image/jpeg" },
    body: blob,
  });
  if (!putRes.ok) throw new Error("Зураг илгээхэд алдаа гарлаа. Сүлжээгээ шалгана уу.");

  // Metadata бүртгэл — document-ын бүртгэл server талд хадгалагдана
  const regRes = await fetch(`/api/verifications/${requestId}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      objectKey,
      documentType,
      fileSize: blob.size,
      contentType: blob.type || "image/jpeg",
      faceResult,
    }),
  });
  const regJson = await regRes.json();
  if (!regJson.ok) throw new Error(regJson.error ?? "Баримт бүртгэхэд алдаа гарлаа.");

  return objectKey;
}
