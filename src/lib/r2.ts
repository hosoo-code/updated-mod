import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { serverEnv } from "./env";

/**
 * Cloudflare R2 — PRIVATE bucket.
 * Public URL ХЭЗЭЭ Ч үүсгэхгүй. Зөвхөн short-lived signed URL.
 */

const UPLOAD_TTL_SEC = 300; // 5 минут
const DOWNLOAD_TTL_SEC = 120; // 2 минут

function client(): S3Client {
  const env = serverEnv();
  return new S3Client({
    region: "auto",
    endpoint: env.r2Endpoint || `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.r2AccessKeyId,
      secretAccessKey: env.r2SecretAccessKey,
    },
  });
}

export function buildObjectKey(
  userId: string,
  requestId: string,
  documentType: "id-card" | "birth-certificate" | "face"
): string {
  const folder = documentType === "face" ? "face" : "document";
  const file = documentType === "face" ? "face.jpg" : `${documentType}.jpg`;
  return `verification/${userId}/${requestId}/${folder}/${file}`;
}

/**
 * Upload presigned URL — client R2 руу шууд (signed) upload хийнэ.
 * Server нь object key-ийг бүрэн хянана, client path сонгох боломжгүй.
 */
export async function createPresignedUploadUrl(
  objectKey: string,
  contentType: string
): Promise<string> {
  const env = serverEnv();
  const command = new PutObjectCommand({
    Bucket: env.r2BucketName,
    Key: objectKey,
    ContentType: contentType,
    // Сервер талд хяналттай metadata — client өөрчлөх боломжгүй
    Metadata: { uploaded: "true" },
  });
  return getSignedUrl(client(), command, { expiresIn: UPLOAD_TTL_SEC });
}

/** Admin review-д зориулсан short-lived signed download URL */
export async function createPresignedDownloadUrl(objectKey: string): Promise<string> {
  const env = serverEnv();
  const command = new GetObjectCommand({
    Bucket: env.r2BucketName,
    Key: objectKey,
  });
  return getSignedUrl(client(), command, { expiresIn: DOWNLOAD_TTL_SEC });
}

/** Retention-д зориулж object устгах */
export async function deleteR2Object(objectKey: string): Promise<void> {
  const env = serverEnv();
  const command = new DeleteObjectCommand({
    Bucket: env.r2BucketName,
    Key: objectKey,
  });
  await client().send(command);
}

/**
 * Модератор анкетын зургийн object key — олон алхамт анкетын 6 үнэмлэх + селфи.
 * Slot: `id-front-0|1|2`, `id-back-0|1|2`, `selfie`
 */
export function buildApplicationObjectKey(
  userId: string,
  applicationId: string,
  slot: string
): string {
  const file = slot === "selfie" ? "selfie.jpg" : `${slot}.jpg`;
  return `moderator-application/${userId}/${applicationId}/${file}`;
}

export const APP_OBJECT_PREFIX = "moderator-application/";

/** Object key-ийг харьяалал шалгах — IDOR хамгаалалт (verification + анкет хоёулаа) */
export function isObjectOwnedByUser(objectKey: string, userId: string): boolean {
  return (
    objectKey.startsWith(`verification/${userId}/`) ||
    objectKey.startsWith(`${APP_OBJECT_PREFIX}${userId}/`)
  );
}

/** Object key нь модератор анкетын зураг мөн эсэх */
export function isApplicationObject(objectKey: string): boolean {
  return objectKey.startsWith(APP_OBJECT_PREFIX);
}

/** Анкетын object key-ээс applicationId-г гаргаж авах (ойролцоо id магадлал бага) */
export function applicationIdFromKey(objectKey: string): string | null {
  if (!objectKey.startsWith(APP_OBJECT_PREFIX)) return null;
  const parts = objectKey.split("/");
  return parts[3] ?? null;
}
