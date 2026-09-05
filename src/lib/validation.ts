import { z } from "zod";

/**
 * Бүх input-ыг Zod-оор сервер талд баталгаажуулна.
 * Client-ийн утгуудад хэзээ ч шууд итгэхгүй.
 */

export const FACEBOOK_URL_REGEX =
  /^https?:\/\/(www\.)?(facebook\.com|fb\.com)\/(profile\.php\?id=\d+|[A-Za-z0-9.\-_]+)\/?.*$/i;

export const PHONE_REGEX = /^[+]?[\d\s\-()]{6,16}$/;

const maxString = (max: number, label: string) =>
  z.string().trim().min(1, `${label} заавал оруулна`).max(max, `${label} хэтэрхий урт`);

export const applicationSchema = z.object({
  fullName: maxString(80, "Нэр"),
  nickname: maxString(40, "Moderator нэр"),
  email: z.string().trim().email("И-мэйл буруу байна"),
  phone: z
    .string()
    .trim()
    .regex(PHONE_REGEX, "Утасны дугаар буруу байна")
    .max(20)
    .optional()
    .or(z.literal("")),
  facebookUrl: z
    .string()
    .trim()
    .regex(FACEBOOK_URL_REGEX, "Facebook линк буруу байна")
    .max(200)
    .optional()
    .or(z.literal("")),
  groupsText: z.string().trim().max(300).optional().or(z.literal("")),
  additionalInfo: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const consentSchema = z.object({
  version: z.string().trim().min(1).max(20),
  purpose: z.enum(["identity_verification", "weekly_verification", "location"]),
});

export const verificationCreateSchema = z.object({
  documentType: z.enum(["id-card", "birth-certificate"]),
  // ID нь серверээс үүсдэг opaque identifier — формат албаддаггүй,
  // эзэмшлийг сервер талд шалгана.
  consentId: z.string().min(1).max(100),
});

export const documentRegisterSchema = z.object({
  objectKey: z.string().min(5).max(500),
  documentType: z.enum(["id-card", "birth-certificate", "face"]),
  fileSize: z.number().int().min(1).max(10 * 1024 * 1024),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  faceResult: z
    .object({
      passed: z.boolean(),
      livenessPassed: z.boolean(),
      checks: z.object({
        faceDetected: z.boolean(),
        singleFace: z.boolean(),
        lightingOk: z.boolean(),
        centered: z.boolean(),
        stepsCompleted: z.number().min(0),
        steps: z.array(z.boolean()).max(6),
        blinkDetected: z.boolean(),
        sizeVariance: z.number().min(0),
        colorConsistent: z.boolean(),
        totalElapsedMs: z.number().min(0),
        confidence: z.number().min(0).max(1),
      }),
      note: z.string().max(300).nullable(),
    })
    .optional(),
});

export const uploadUrlSchema = z.object({
  requestId: z.string().min(1).max(100),
  documentType: z.enum(["id-card", "birth-certificate", "face"]),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  fileSize: z.number().int().min(1).max(10 * 1024 * 1024),
});

export const weeklyLocationSchema = z.object({
  consentId: z.string().min(1).max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  accuracy: z.number().min(0).max(100_000).optional(),
});

export const profileUpdateSchema = z.object({
  nickname: maxString(40, "Moderator нэр").optional(),
  facebookUrl: z
    .string()
    .trim()
    .regex(FACEBOOK_URL_REGEX, "Facebook линк буруу байна")
    .max(200)
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(PHONE_REGEX, "Утасны дугаар буруу байна")
    .max(20)
    .optional()
    .or(z.literal("")),
});

// ---------- Admin schemas ----------

export const groupSchema = z.object({
  name: maxString(120, "Group нэр"),
  facebookUrl: z
    .string()
    .trim()
    .regex(FACEBOOK_URL_REGEX, "Facebook линк буруу байна")
    .max(200)
    .optional()
    .or(z.literal("")),
  memberCount: z.coerce.number().int().min(0).max(100_000_000),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  price: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  isActive: z.boolean(),
});

export const priceSchema = z.object({
  title: maxString(60, "Гарчиг"),
  durationMonths: z.coerce.number().int().min(1).max(60),
  price: z.coerce.number().int().min(0).max(1_000_000_000),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  isActive: z.boolean(),
});

export const accountSchema = z.object({
  bankName: maxString(80, "Банкны нэр"),
  accountHolder: maxString(120, "Данс эзэмшигчийн нэр"),
  accountNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{6,20}$/, "Дансны дугаар зөвхөн цифр байх ёстой"),
  note: z.string().trim().max(300).optional().or(z.literal("")),
  isActive: z.boolean(),
});

export const reviewDecisionSchema = z.object({
  decision: z.enum(["approve", "reject", "resubmit"]),
  reason: z
    .enum(["unclear", "expired_document", "face_failed", "mismatch", "other"])
    .optional(),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export const settingsSchema = z.object({
  documentRetentionDays: z.coerce.number().int().min(1).max(3650),
  weeklyVerificationEnabled: z.boolean(),
  weeklyIntervalDays: z.coerce.number().int().min(1).max(90),
  consentVersion: z.string().trim().min(1).max(20),
});

export const applicationDecisionSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  moderatorId: z.string().optional(),
});

export const moderatorAdminSchema = z.object({
  fullName: maxString(80, "Нэр"),
  nickname: maxString(40, "Moderator нэр"),
  facebookUrl: z
    .string()
    .trim()
    .regex(FACEBOOK_URL_REGEX, "Facebook линк буруу байна")
    .max(200)
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(PHONE_REGEX, "Утасны дугаар буруу байна")
    .max(20)
    .optional()
    .or(z.literal("")),
  locationText: z.string().trim().max(200).optional().or(z.literal("")),
  isPublic: z.boolean(),
  isActive: z.boolean(),
  groupIds: z.array(z.string()).max(50),
});

/* ============ Moderator application (олон алхамт анкет) ============ */

/** Анкетын зургийн slot — 6 иргэний үнэмлэх + селфи */
export const APP_IMAGE_SLOTS = [
  "id-front-0",
  "id-front-1",
  "id-front-2",
  "id-back-0",
  "id-back-1",
  "id-back-2",
  "selfie",
] as const;
export type AppImageSlot = (typeof APP_IMAGE_SLOTS)[number];

export const uploadAppImageSchema = z.object({
  applicationId: z.string().min(1).max(100),
  slot: z.enum(APP_IMAGE_SLOTS),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  fileSize: z.number().int().min(1).max(10 * 1024 * 1024),
});

const parentSchema = z.object({
  name: z.string().trim().min(1, "Нэр заавал оруулна").max(80),
  phone: z.string().trim().regex(PHONE_REGEX, "Утасны дугаар буруу байна").max(20),
  facebookLink: z.string().trim().regex(FACEBOOK_URL_REGEX, "Facebook линк буруу байна").max(200),
});

const bankSchema = z.object({
  bankName: z.string().trim().min(1, "Банкны нэр заавал").max(80),
  accountNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{6,20}$/, "Дансны дугаар зөвхөн цифр (6-20)"),
});

export const addressFromSubmitSchema = z.object({
  mapsLink: z.string().url("Google Maps линк буруу байна").max(500),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100_000).nullable().optional(),
  vpnCheck: z.object({
    detected: z.boolean(),
    score: z.number().min(0).max(100).optional(),
  }),
});

/** Анкет илгээх (submit) эцсийн баталгаажуулалт — сервер талд бүх мэдээлэл бүрэн шалгана */
export const applyWizardSubmitSchema = z.object({
  fullName: z.string().trim().min(1, "Нэр заавал оруулна").max(80),
  facebookLink: z.string().trim().regex(FACEBOOK_URL_REGEX, "Facebook линк буруу байна").max(200),
  phoneNumbers: z
    .array(z.string().trim().regex(PHONE_REGEX, "Утасны дугаар буруу байна").max(20))
    .min(1, "Үндсэн утасны дугаар заавал")
    .max(3, "Хамгийн ихдээ 3 дугаар"),
  idCardFrontUrls: z.array(z.string().min(5).max(500)).length(3, "Урд талын 3 зураг заавал"),
  idCardBackUrls: z.array(z.string().min(5).max(500)).length(3, "Ар талын 3 зураг заавал"),
  selfieFaceUrl: z.string().min(5).max(500),
  father: parentSchema,
  mother: parentSchema,
  bankAccounts: z.array(bankSchema).min(1, "Хамгийн багадаа 1 данс заавал"),
  address: addressFromSubmitSchema,
  /** Селфи-ээс цуглуулсан liveness anti-spoof мэдээлэл — admin хяналтад ашиглана */
  faceResult: z
    .object({
      passed: z.boolean(),
      livenessPassed: z.boolean(),
      checks: z.object({
        faceDetected: z.boolean(),
        singleFace: z.boolean(),
        lightingOk: z.boolean(),
        centered: z.boolean(),
        stepsCompleted: z.number().min(0),
        steps: z.array(z.boolean()).max(6),
        blinkDetected: z.boolean(),
        sizeVariance: z.number().min(0),
        colorConsistent: z.boolean(),
        totalElapsedMs: z.number().min(0),
        confidence: z.number().min(0).max(1),
      }),
      note: z.string().max(300).nullable(),
    })
    .optional(),
});

export const setApplicationStatusSchema = z.object({
  decision: z.enum(["approve", "reject", "editable"]),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
