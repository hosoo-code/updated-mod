import "server-only";
import {
  S3Client,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { serverEnv } from "@/lib/env";
import type { DocReaderProvider, ParentInfo, DocumentReadResult } from "@/types";
import {
  buildDocumentReadResult,
  buildPendingDocumentRead,
} from "@/lib/ocr-match";

/**
 * Баримт (төрсний гэрчилгээ) OCR — ЗӨВХӨН server талд ажиллана.
 *
 * Pluggable provider загвар — VPN шалгалтын (`vpn-check.ts`) `provider:"none"`
 * fail-open загварыг дагана:
 *   .env.local-д: DOC_READER_API_KEY=...
 *
 * Түлхүүр тохируулаагүй бол `provider:"none"` → текст уншихгүй, matchStatus
 * "pending" болно (dev/test-д урсгалыг саадгүй ажиллуулах). Бодит OCR уншилт
 * шаардлагатай бол DOC_READER_API_KEY-г оруулна — энэ функц нэг газарч
 * холбогдож, `submitModeratorApplication` бүр дуудаж admin-д нотолгоо өгнө.
 *
 * Одоогийн provider: Google Cloud Vision TextDetection (рекомендсан эхний).
 * Солих боломжтой: Tesseract (санах ойд зориулсан worker), Azure/Textract,
 * руу хэрэгтэй бол `readDocumentText` тусдаа салбарыг сонго.
 *
 * OCR үр дүн нь admin-ын эцсийн шийдвэрийг ОРЛОХГҮЙ — зөвхөн нотолгоо (evidence)
 * болно (одоогийн `faceResult`/`documentScanStatus` загварын адил — систем
 * зөрчил тэмдэглэж, хүн шийднэ).
 */

export interface DocumentReadInput {
  birthCertificateKey: string;
  father: ParentInfo;
  mother: ParentInfo;
}

function r2Client(): S3Client {
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

/** R2 object-ийг buffer болгон татаж авна (OCR-т илгээх). */
async function downloadObject(objectKey: string): Promise<Uint8Array> {
  const env = serverEnv();
  const command = new GetObjectCommand({ Bucket: env.r2BucketName, Key: objectKey });
  const res = await r2Client().send(command);
  const body = await res.Body?.transformToByteArray();
  if (!body) throw new Error("Object хоосон байна.");
  return body;
}

/** Google Cloud Vision TextDetection руу илгээж текстийг гаргаж авна. */
async function readWithGoogleVision(
  objectKey: string,
  apiKey: string
): Promise<string> {
  const bytes = await downloadObject(objectKey);
  const base64 = Buffer.from(bytes).toString("base64");
  const body = {
    requests: [
      {
        image: { content: base64 },
        features: [{ type: "TEXT_DETECTION" }],
      },
    ],
  };
  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    }
  );
  if (!res.ok) throw new Error(`Vision API алдаа: ${res.status}`);
  const data = (await res.json()) as {
    responses?: { fullTextAnnotation?: { text?: string } }[];
  };
  return data.responses?.[0]?.fullTextAnnotation?.text ?? "";
}

/**
 * Баримтын текстийг уншина.
 * Provider: `google` (Vision) | `none` (түлхүүргүй).
 */
export async function readDocumentText(
  objectKey: string
): Promise<{ provider: DocReaderProvider; extractedText: string | null }> {
  // Provider "google" — эхний интеграци. Бусад provider нэмэхдээ энд салбарлана.
  const docReaderKey = process.env.DOC_READER_API_KEY ?? "";
  if (docReaderKey) {
    const text = await readWithGoogleVision(objectKey, docReaderKey);
    return { provider: "google", extractedText: text || null };
  }
  // Түлхүүргүй → provider "none" — уншихгүй, fail-open (админ гараар шалгана)
  return { provider: "none", extractedText: null };
}

/**
 * Төрсний гэрчилгээг уншиж, эцэг эхийн мэдээлэлтэй тааруулж, нотолгоо буцаана.
 * Алдаа/орон зайгүй үед `pending` (fail-open) — submit-ыг хэзээ ч бүтэлгүйтүүлэхгүй.
 */
export async function runDocumentRead(
  input: DocumentReadInput
): Promise<DocumentReadResult> {
  try {
    const { provider, extractedText } = await readDocumentText(input.birthCertificateKey);
    return buildDocumentReadResult(
      provider,
      extractedText,
      input.father,
      input.mother,
      input.birthCertificateKey
    );
  } catch (e) {
    // Provider алдаа / object татаж чадахгүй — fail-open
    const msg = e instanceof Error ? e.message : "OCR уншилт амжилтгүй";
    return buildPendingDocumentRead(input.birthCertificateKey, `OCR алдаа: ${msg}`);
  }
}
