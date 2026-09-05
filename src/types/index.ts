/**
 * ARHAT MODERATOR — Домэйн төрлүүд.
 * Database schema (supabase/schema.sql) болон API response-той нийцүүлсэн.
 */

export type VerificationStatus =
  | "unverified" // баталгаажаагүй
  | "pending" // хүлээгдэж буй
  | "approved" // баталгаажсан
  | "rejected" // татгалзсан
  | "expired"; // хугацаа дууссан

export type RequestStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "resubmit_requested"
  | "expired";

export type DocumentType = "id-card" | "birth-certificate" | "face";

export type RejectReason =
  | "unclear"
  | "expired_document"
  | "face_failed"
  | "mismatch"
  | "other";

export const REJECT_REASON_LABELS: Record<RejectReason, string> = {
  unclear: "Баримт тодорхойгүй",
  expired_document: "Баримтны хугацаа дууссан",
  face_failed: "Нүүрний баталгаажуулалт амжилтгүй",
  mismatch: "Мэдээлэл таарахгүй",
  other: "Бусад",
};

export interface GroupRef {
  id: string;
  name: string;
  memberCount: number;
  isActive: boolean;
  isPrimary?: boolean;
}

export interface Group {
  id: string;
  name: string;
  imageUrl: string | null;
  facebookUrl: string | null;
  memberCount: number;
  description: string | null;
  price: number | null;
  isActive: boolean;
  isHidden: boolean;
  sortOrder: number;
  createdAt: string;
  moderators: GroupRef[];
}

export interface Moderator {
  id: string;
  userId: string | null;
  fullName: string;
  nickname: string;
  avatarUrl: string | null;
  facebookUrl: string | null;
  phone: string | null;
  // Хувийн талбарууд — public API-д ХЭЗЭЭ Ч илгээгдэхгүй
  address?: string | null;
  parentPhone?: string | null;
  locationText: string | null;
  locationStatus: "none" | "verified" | "expired";
  becameModeratorAt: string | null;
  verificationStatus: VerificationStatus;
  verifiedAt: string | null;
  lastWeeklyVerificationAt: string | null;
  nextWeeklyVerificationAt: string | null;
  isActive: boolean;
  isPublic: boolean;
  createdAt: string;
  groups: GroupRef[];
}

/** Public profile-д илгээгддэг зөвхөн-нийтийн талбарууд */
export type PublicModerator = Omit<
  Moderator,
  "address" | "parentPhone" | "userId"
>;

export interface ServicePrice {
  id: string;
  title: string;
  durationMonths: number | null;
  price: number;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface PaymentAccount {
  id: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  note: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface ModeratorApplication {
  id: string;
  userId: string | null;
  fullName: string;
  nickname: string;
  email: string;
  phone: string | null;
  facebookUrl: string | null;
  groupsText: string | null;
  additionalInfo: string | null;
  status: ApplicationStatus;
  createdAt: string;
}

/** Олон алхамт модератор анкетын төлөв */
export type ModeratorAppStatus = "draft" | "submitted" | "editable" | "approved" | "rejected";

export interface BankAccountInput {
  bankName: string;
  accountNumber: string;
}

export interface AddressHistoryEntry {
  mapsLink: string;
  capturedAt: string;
}

export interface ParentInfo {
  name: string;
  phone: string;
  facebookLink: string;
}

export type FaceScanStatus = "pending" | "matched" | "failed";
export type DocumentScanStatus = "pending" | "verified" | "failed";

/** `moderator_applications` хүснэгтийн бүрэн бүтэц (camelCase) */
export interface ModeratorApplicationData {
  id: string;
  userId: string | null;
  fullName: string;
  facebookLink: string;
  phoneNumbers: string[];
  idCardFrontUrls: string[];
  idCardBackUrls: string[];
  selfieFaceUrl: string | null;
  faceMatchStatus: FaceScanStatus;
  documentScanStatus: DocumentScanStatus;
  faceMatchScore: number | null;
  documentScanScore: number | null;
  father: ParentInfo;
  mother: ParentInfo;
  bankAccounts: BankAccountInput[];
  currentAddressMapsLink: string | null;
  addressHistory: AddressHistoryEntry[];
  vpnDetected: boolean;
  status: ModeratorAppStatus;
  verificationNotes: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Wizard-ийн draft state (client дээр ачаалах/хадгалах) */
export interface ApplyWizardData {
  fullName: string;
  facebookLink: string;
  phoneNumbers: string[];
  idCardFrontUrls: string[];
  idCardBackUrls: string[];
  selfieFaceUrl: string | null;
  father: ParentInfo;
  mother: ParentInfo;
  bankAccounts: BankAccountInput[];
  currentAddressMapsLink: string | null;
  vpnDetected: boolean;
}

/** Зөвшөөрөл (consent) бүртгэл */
export interface Consent {
  id: string;
  userId: string;
  version: string;
  purpose: string;
  createdAt: string;
}

export interface VerificationRequest {
  id: string;
  userId: string | null;
  moderatorId: string | null;
  fullName: string;
  nickname: string;
  documentType: DocumentType;
  status: RequestStatus;
  rejectReason: RejectReason | null;
  rejectNote: string | null;
  consentId: string | null;
  faceResult: FaceCheckResult | null;
  locationStatus: "none" | "verified" | "denied" | "unavailable";
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  documents: VerificationDocument[];
}

export interface VerificationDocument {
  id: string;
  requestId: string;
  userId: string | null;
  documentType: DocumentType;
  objectKey: string;
  fileSize: number;
  contentType: string;
  status: "uploaded" | "deleted";
  retentionUntil: string | null;
  createdAt: string;
}

export interface FaceCheckResult {
  passed: boolean;
  livenessPassed: boolean;
  checks: {
    faceDetected: boolean;
    singleFace: boolean;
    lightingOk: boolean;
    centered: boolean;
    stepsCompleted: number;
  };
  note: string | null;
}

export interface LocationRecord {
  id: string;
  userId: string | null;
  moderatorName: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  isCoarse: boolean;
  consentId: string | null;
  kind: "identity" | "weekly" | "share";
  createdAt: string;
  /** Байршил хуваалцсан огноо ('share' төрлийн бичлэгт хэрэглэгдэнэ) */
  sharedAt?: string | null;
  /** Хүчинтэй хугацааны төгсгөл (shared_at + 7 хоног) */
  expiresAt?: string | null;
}

/** Admin панелд харуулах — хэрэглэгч бүрийн хамгийн сүүлийн идэвхтэй location */
export interface ActiveLocationShare {
  id: string;
  userId: string | null;
  moderatorName: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  sharedAt: string;
  expiresAt: string;
  isExpired: boolean;
}

export interface IpHistoryEntry {
  id: string;
  userId: string | null;
  moderatorName: string;
  ip: string;
  eventType: "weekly" | "identity" | "login";
  status: "verified" | "failed" | "logged";
  nextVerificationAt: string | null;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  adminName: string;
  action: string;
  actionLabel: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  userId: string | null;
  fullName: string;
  role: "super_admin" | "admin";
  isActive: boolean;
}

export interface PlatformSettings {
  documentRetentionDays: number;
  weeklyVerificationEnabled: boolean;
  weeklyIntervalDays: number;
  consentVersion: string;
}

export interface WeeklyStatus {
  verified: boolean;
  lastVerificationAt: string | null;
  nextVerificationAt: string | null;
  due: boolean;
  enabled: boolean;
  history: IpHistoryEntry[];
}

export interface AdminStats {
  totalModerators: number;
  verifiedModerators: number;
  pendingVerification: number;
  rejectedVerification: number;
  totalGroups: number;
  totalMembers: number;
  recentApplications: ModeratorApplication[];
  weeklyOverview: IpHistoryEntry[];
  verificationActivity: { date: string; count: number }[];
}

export interface SessionUser {
  id: string;
  email: string;
  role: "user" | "admin";
  fullName: string | null;
  moderatorId: string | null;
}
