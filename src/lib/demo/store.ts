import {
  addDaysISO,
} from "@/lib/utils";
import type {
  ActiveLocationShare,
  AdminStats,
  AdminUser,
  AuditEntry,
  Consent,
  FaceCheckResult,
  Group,
  IpHistoryEntry,
  LocationRecord,
  Moderator,
  ModeratorApplication,
  ModeratorApplicationData,
  PaymentAccount,
  PlatformSettings,
  RequestStatus,
  RejectReason,
  ServicePrice,
  VerificationDocument,
  VerificationRequest,
  WeeklyStatus,
} from "@/types";

/**
 * DEMO горимын in-memory өгөгдлийн сан.
 * Production-д энэ файлыг ашиглахгүй — Supabase/R2 ашиглагдана.
 * Demo өгөгдөл нь ЗОХИОМОЛ (fictional) бөгөөд бодит хүний мэдээлэл биш.
 */

const now = new Date();
const iso = (daysAgo: number, hour = 12) => {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export const DEMO_MODERATOR_USER_ID = "demo-mod-0001";
export const DEMO_ADMIN_USER_ID = "demo-admin-0001";

interface DemoSession {
  userId: string;
  email: string;
  role: "user" | "admin";
  fullName: string;
  moderatorId: string | null;
}

interface SeedData {
  moderators: Moderator[];
  groups: Group[];
  prices: ServicePrice[];
  accounts: PaymentAccount[];
  applications: ModeratorApplication[];
  applications2: ModeratorApplicationData[];
  consents: Consent[];
  requests: VerificationRequest[];
  locations: LocationRecord[];
  ips: IpHistoryEntry[];
  audit: AuditEntry[];
  admins: AdminUser[];
  settings: PlatformSettings;
  documentBlobs: Map<string, { dataUrl: string; contentType: string; size: number }>;
  sessions: Map<string, DemoSession>;
}

function buildGroups(): Group[] {
  const modRef = (id: string, name: string, isPrimary = false) => ({
    id,
    name,
    memberCount: 0,
    isActive: true,
    isPrimary,
  });
  return [
    {
      id: "grp-arhat-official",
      name: "Arhat Official — MLBB Mongolia",
      imageUrl: null,
      facebookUrl: "https://facebook.com/groups/arhat-official",
      memberCount: 511_000,
      description:
        "Mobile Legends: Bang Bang Mongolia-ийн албан ёсны нийгэмлэг. Мэдээ мэдээлэл, тэмцээн, арга хэмжээний мэдээллийг эндээс авна.",
      price: 69_999,
      isActive: true,
      isHidden: false,
      sortOrder: 1,
      createdAt: iso(400),
      moderators: [
        modRef("mod-1", "Архат", true),
        modRef("mod-2", "Золбоо"),
        modRef("mod-3", "Намуун"),
      ],
    },
    {
      id: "grp-arhat-community",
      name: "Arhat Community",
      imageUrl: null,
      facebookUrl: "https://facebook.com/groups/arhat-community",
      memberCount: 302_000,
      description:
        "Тоглогчдын нийгэмлэг — бүртгэл, зөвлөгөө, эвент, шинэ тоглогчдод туслах групп.",
      price: 36_999,
      isActive: true,
      isHidden: false,
      sortOrder: 2,
      createdAt: iso(380),
      moderators: [
        modRef("mod-1", "Архат"),
        modRef("mod-4", "Тэмүүлэн", true),
        modRef("mod-5", "Сарнай"),
      ],
    },
    {
      id: "grp-mlbb-mongolia",
      name: "MLBB Mongolia Community",
      imageUrl: null,
      facebookUrl: "https://facebook.com/groups/mlbb-mongolia",
      memberCount: 144_000,
      description: "Mobile Legends-ийн Монгол дахь нийгэмлэгийн групп.",
      price: 17_999,
      isActive: true,
      isHidden: false,
      sortOrder: 3,
      createdAt: iso(300),
      moderators: [modRef("mod-2", "Золбоо", true), modRef("mod-3", "Намуун")],
    },
    {
      id: "grp-arhat-academy",
      name: "Arhat Academy",
      imageUrl: null,
      facebookUrl: "https://facebook.com/groups/arhat-academy",
      memberCount: 93_000,
      description: "Сургалт, хичээл, зөвлөгөө — MLBB-г мэргэжлийн түвшинд сурах групп.",
      price: 52_999,
      isActive: false,
      isHidden: false,
      sortOrder: 4,
      createdAt: iso(200),
      moderators: [modRef("mod-4", "Тэмүүлэн")],
    },
  ];
}

function buildModerators(): Moderator[] {
  return [
    {
      id: "mod-1",
      userId: DEMO_MODERATOR_USER_ID,
      fullName: "Бат-Эрдэнэ Архат",
      nickname: "Архат",
      avatarUrl: null,
      facebookUrl: "https://facebook.com/arhat.moderator",
      phone: "+976 9911 2233",
      locationText: "Улаанбаатар хот",
      locationStatus: "verified",
      becameModeratorAt: iso(400),
      verificationStatus: "approved",
      verifiedAt: iso(300),
      lastWeeklyVerificationAt: iso(1),
      nextWeeklyVerificationAt: iso(-6),
      isActive: true,
      isPublic: true,
      createdAt: iso(400),
      groups: [
        { id: "grp-arhat-official", name: "Arhat Official — MLBB Mongolia", memberCount: 511_000, isActive: true, isPrimary: true },
        { id: "grp-arhat-community", name: "Arhat Community", memberCount: 302_000, isActive: true },
      ],
    },
    {
      id: "mod-2",
      userId: null,
      fullName: "Золбоо Баттулга",
      nickname: "Золбоо",
      avatarUrl: null,
      facebookUrl: "https://facebook.com/zolboo.mlb",
      phone: "+976 9988 1122",
      locationText: "Улаанбаатар хот",
      locationStatus: "verified",
      becameModeratorAt: iso(350),
      verificationStatus: "approved",
      verifiedAt: iso(280),
      lastWeeklyVerificationAt: iso(3),
      nextWeeklyVerificationAt: iso(-4),
      isActive: true,
      isPublic: true,
      createdAt: iso(350),
      groups: [
        { id: "grp-arhat-official", name: "Arhat Official — MLBB Mongolia", memberCount: 511_000, isActive: true },
        { id: "grp-mlbb-mongolia", name: "MLBB Mongolia Community", memberCount: 144_000, isActive: true, isPrimary: true },
      ],
    },
    {
      id: "mod-3",
      userId: null,
      fullName: "Намуун Эрдэнэ",
      nickname: "Намуун",
      avatarUrl: null,
      facebookUrl: "https://facebook.com/namuun.ml",
      phone: "+976 9912 3344",
      locationText: "Дархан-Уул аймаг",
      locationStatus: "verified",
      becameModeratorAt: iso(180),
      verificationStatus: "approved",
      verifiedAt: iso(150),
      lastWeeklyVerificationAt: iso(9),
      nextWeeklyVerificationAt: null,
      isActive: true,
      isPublic: true,
      createdAt: iso(180),
      groups: [
        { id: "grp-arhat-official", name: "Arhat Official — MLBB Mongolia", memberCount: 511_000, isActive: true },
        { id: "grp-mlbb-mongolia", name: "MLBB Mongolia Community", memberCount: 144_000, isActive: true },
      ],
    },
    {
      id: "mod-4",
      userId: null,
      fullName: "Тэмүүлэн Ганболд",
      nickname: "Тэмүүлэн",
      avatarUrl: null,
      facebookUrl: "https://facebook.com/temuulen.ml",
      phone: "+976 9900 5566",
      locationText: "Эрдэнэт хот",
      locationStatus: "verified",
      becameModeratorAt: iso(120),
      verificationStatus: "pending",
      verifiedAt: null,
      lastWeeklyVerificationAt: iso(1),
      nextWeeklyVerificationAt: iso(-6),
      isActive: true,
      isPublic: true,
      createdAt: iso(120),
      groups: [
        { id: "grp-arhat-community", name: "Arhat Community", memberCount: 302_000, isActive: true, isPrimary: true },
        { id: "grp-arhat-academy", name: "Arhat Academy", memberCount: 93_000, isActive: false },
      ],
    },
    {
      id: "mod-5",
      userId: null,
      fullName: "Сарнай Отгонбаяр",
      nickname: "Сарнай",
      avatarUrl: null,
      facebookUrl: "https://facebook.com/sarnai.mlb",
      phone: "+976 8800 7788",
      locationText: "Улаанбаатар хот",
      locationStatus: "none",
      becameModeratorAt: iso(60),
      verificationStatus: "rejected",
      verifiedAt: null,
      lastWeeklyVerificationAt: null,
      nextWeeklyVerificationAt: null,
      isActive: true,
      isPublic: true,
      createdAt: iso(60),
      groups: [
        { id: "grp-arhat-community", name: "Arhat Community", memberCount: 302_000, isActive: true },
      ],
    },
  ];
}

function buildRequests(): VerificationRequest[] {
  const faceOk: FaceCheckResult = {
    passed: true,
    livenessPassed: true,
    checks: {
      faceDetected: true,
      singleFace: true,
      lightingOk: true,
      centered: true,
      stepsCompleted: 4,
    },
    note: "Нүүрний байрлал, liveness шалгалт амжилттай",
  };
  return [
    {
      id: "req-demo-0001",
      userId: DEMO_MODERATOR_USER_ID,
      moderatorId: "mod-1",
      fullName: "Бат-Эрдэнэ Архат",
      nickname: "Архат",
      documentType: "id-card",
      status: "pending",
      rejectReason: null,
      rejectNote: null,
      consentId: "consent-0001",
      faceResult: faceOk,
      locationStatus: "verified",
      submittedAt: iso(2, 15),
      reviewedAt: null,
      reviewedBy: null,
      createdAt: iso(3, 10),
      documents: [
        {
          id: "doc-0001",
          requestId: "req-demo-0001",
          userId: DEMO_MODERATOR_USER_ID,
          documentType: "id-card",
          objectKey: "verification/demo-mod-0001/req-demo-0001/document/id-front.jpg",
          fileSize: 412_000,
          contentType: "image/jpeg",
          status: "uploaded",
          retentionUntil: iso(-28),
          createdAt: iso(2, 15),
        },
        {
          id: "doc-0002",
          requestId: "req-demo-0001",
          userId: DEMO_MODERATOR_USER_ID,
          documentType: "face",
          objectKey: "verification/demo-mod-0001/req-demo-0001/face/face.jpg",
          fileSize: 233_000,
          contentType: "image/jpeg",
          status: "uploaded",
          retentionUntil: iso(-28),
          createdAt: iso(2, 15),
        },
      ],
    },
    {
      id: "req-demo-0002",
      userId: null,
      moderatorId: "mod-4",
      fullName: "Тэмүүлэн Ганболд",
      nickname: "Тэмүүлэн",
      documentType: "birth-certificate",
      status: "pending",
      rejectReason: null,
      rejectNote: null,
      consentId: "consent-0002",
      faceResult: faceOk,
      locationStatus: "verified",
      submittedAt: iso(1, 9),
      reviewedAt: null,
      reviewedBy: null,
      createdAt: iso(2, 20),
      documents: [
        {
          id: "doc-0003",
          requestId: "req-demo-0002",
          userId: null,
          documentType: "birth-certificate",
          objectKey: "verification/req-demo-0002/document/birth.jpg",
          fileSize: 380_000,
          contentType: "image/jpeg",
          status: "uploaded",
          retentionUntil: iso(-28),
          createdAt: iso(1, 9),
        },
        {
          id: "doc-0004",
          requestId: "req-demo-0002",
          userId: null,
          documentType: "face",
          objectKey: "verification/req-demo-0002/face/face.jpg",
          fileSize: 210_000,
          contentType: "image/jpeg",
          status: "uploaded",
          retentionUntil: iso(-28),
          createdAt: iso(1, 9),
        },
      ],
    },
    {
      id: "req-demo-0003",
      userId: null,
      moderatorId: "mod-5",
      fullName: "Сарнай Отгонбаяр",
      nickname: "Сарнай",
      documentType: "id-card",
      status: "rejected",
      rejectReason: "unclear",
      rejectNote: "Баримтын зураг бүдэг, дахин авах шаардлагатай",
      consentId: "consent-0003",
      faceResult: {
        passed: true,
        livenessPassed: true,
        checks: { faceDetected: true, singleFace: true, lightingOk: true, centered: true, stepsCompleted: 4 },
        note: null,
      },
      locationStatus: "denied",
      submittedAt: iso(7, 11),
      reviewedAt: iso(5, 16),
      reviewedBy: "Архат Админ",
      createdAt: iso(8, 10),
      documents: [
        {
          id: "doc-0005",
          requestId: "req-demo-0003",
          userId: null,
          documentType: "id-card",
          objectKey: "verification/req-demo-0003/document/id-front.jpg",
          fileSize: 350_000,
          contentType: "image/jpeg",
          status: "uploaded",
          retentionUntil: iso(-28),
          createdAt: iso(7, 11),
        },
      ],
    },
  ];
}

function buildIps(): IpHistoryEntry[] {
  return [
    {
      id: "ip-0001",
      userId: DEMO_MODERATOR_USER_ID,
      moderatorName: "Архат",
      ip: "202.21.104.18",
      eventType: "weekly",
      status: "verified",
      nextVerificationAt: iso(-6),
      createdAt: iso(1, 20),
    },
    {
      id: "ip-0002",
      userId: DEMO_MODERATOR_USER_ID,
      moderatorName: "Архат",
      ip: "202.21.104.18",
      eventType: "weekly",
      status: "verified",
      nextVerificationAt: iso(-13),
      createdAt: iso(8, 19),
    },
    {
      id: "ip-0003",
      userId: DEMO_MODERATOR_USER_ID,
      moderatorName: "Архат",
      ip: "103.26.199.42",
      eventType: "identity",
      status: "verified",
      nextVerificationAt: null,
      createdAt: iso(2, 15),
    },
    {
      id: "ip-0004",
      userId: null,
      moderatorName: "Золбоо",
      ip: "49.0.145.66",
      eventType: "weekly",
      status: "verified",
      nextVerificationAt: iso(-4),
      createdAt: iso(3, 21),
    },
    {
      id: "ip-0005",
      userId: null,
      moderatorName: "Намуун",
      ip: "180.149.79.200",
      eventType: "weekly",
      status: "failed",
      nextVerificationAt: null,
      createdAt: iso(9, 12),
    },
  ];
}

function buildLocations(): LocationRecord[] {
  return [
    {
      id: "loc-0001",
      userId: DEMO_MODERATOR_USER_ID,
      moderatorName: "Архат",
      latitude: 47.92,
      longitude: 106.92,
      accuracy: 1200,
      isCoarse: true,
      consentId: "consent-0004",
      kind: "weekly",
      createdAt: iso(1, 20),
    },
    {
      id: "loc-0002",
      userId: DEMO_MODERATOR_USER_ID,
      moderatorName: "Архат",
      latitude: 47.92,
      longitude: 106.92,
      accuracy: 1400,
      isCoarse: true,
      consentId: "consent-0005",
      kind: "identity",
      createdAt: iso(2, 15),
    },
    {
      id: "loc-0003",
      userId: null,
      moderatorName: "Золбоо",
      latitude: 47.91,
      longitude: 106.9,
      accuracy: 1500,
      isCoarse: true,
      consentId: "consent-0006",
      kind: "weekly",
      createdAt: iso(3, 21),
    },
  ];
}

function buildAudit(): AuditEntry[] {
  return [
    { id: "aud-0001", adminName: "Архат Админ", action: "verification.approve", actionLabel: "Баталгаажуулалт баталсан", targetType: "verification_request", targetId: "req-demo-0000", createdAt: iso(5, 16) },
    { id: "aud-0002", adminName: "Архат Админ", action: "verification.reject", actionLabel: "Баталгаажуулалт татгалзсан", targetType: "verification_request", targetId: "req-demo-0003", createdAt: iso(5, 16) },
    { id: "aud-0003", adminName: "Архат Админ", action: "group.create", actionLabel: "Group нэмсэн", targetType: "group", targetId: "grp-arhat-academy", createdAt: iso(200, 10) },
    { id: "aud-0004", adminName: "Архат Админ", action: "account.create", actionLabel: "Банкны данс нэмсэн", targetType: "payment_account", targetId: "acc-0002", createdAt: iso(100, 11) },
    { id: "aud-0005", adminName: "Архат Админ", action: "price.update", actionLabel: "Үнэ өөрчилсөн", targetType: "service_price", targetId: "price-0001", createdAt: iso(40, 12) },
    { id: "aud-0006", adminName: "Архат Админ", action: "moderator.update", actionLabel: "Moderator мэдээлэл зассан", targetType: "moderator", targetId: "mod-2", createdAt: iso(20, 13) },
    { id: "aud-0007", adminName: "Архат Админ", action: "admin.login", actionLabel: "Админ нэвтэрсэн", targetType: "admin", targetId: null, createdAt: iso(1, 9) },
    { id: "aud-0008", adminName: "Архат Админ", action: "verification.view", actionLabel: "Баталгаажуулалт үзсэн", targetType: "verification_request", targetId: "req-demo-0001", createdAt: iso(1, 10) },
  ];
}

const seed: SeedData = {
  moderators: buildModerators(),
  groups: buildGroups(),
  prices: [
    { id: "price-0001", title: "1 сар", durationMonths: 1, price: 17_999, description: "Нэг сарын үйлчилгээ", isActive: true, sortOrder: 1 },
    { id: "price-0002", title: "3 сар", durationMonths: 3, price: 36_999, description: "Гурван сарын үйлчилгээ — 15% хямдралтай", isActive: true, sortOrder: 2 },
    { id: "price-0003", title: "6 сар", durationMonths: 6, price: 52_999, description: "Зургаан сарын үйлчилгээ — хамгийн эрэлттэй", isActive: true, sortOrder: 3 },
    { id: "price-0004", title: "1 жил", durationMonths: 12, price: 69_999, description: "Нэг жилийн үйлчилгээ — хамгийн ашигтай", isActive: true, sortOrder: 4 },
  ],
  accounts: [
    { id: "acc-0001", bankName: "Khan Bank", accountHolder: "Arhat Edit", accountNumber: "5012345678", note: "Үндсэн данс", isActive: true, sortOrder: 1, createdAt: iso(150) },
    { id: "acc-0002", bankName: "Golomt Bank", accountHolder: "Arhat Edit", accountNumber: "0855001122", note: "Нөөц данс", isActive: true, sortOrder: 2, createdAt: iso(100) },
    { id: "acc-0003", bankName: "TDB (Худалдаа хөгжлийн банк)", accountHolder: "Arhat Edit", accountNumber: "4912345678", note: null, isActive: true, sortOrder: 3, createdAt: iso(90) },
    { id: "acc-0004", bankName: "State Bank", accountHolder: "Arhat Edit", accountNumber: "0200998877", note: "Түр идэвхгүй", isActive: false, sortOrder: 4, createdAt: iso(80) },
  ],
  applications: [
    {
      id: "app-0001",
      userId: null,
      fullName: "Мөнх-Оргил Батсайхан",
      nickname: "Мөнхөө",
      email: "munkhorgil@example.mn",
      phone: "+976 9901 2345",
      facebookUrl: "https://facebook.com/munkhorgil.ml",
      groupsText: "Arhat Official, MLBB Mongolia Community",
      additionalInfo: "MLBB-г 4 жил тоглож байна, өмнө нь 2 групп админ хийж байсан.",
      status: "pending",
      createdAt: iso(1, 14),
    },
    {
      id: "app-0002",
      userId: null,
      fullName: "Билгүүн Дорж",
      nickname: "Билгүүн",
      email: "bilguun.d@example.mn",
      phone: "+976 8811 0099",
      facebookUrl: "https://facebook.com/bilguun.dorj",
      groupsText: "Arhat Community",
      additionalInfo: null,
      status: "pending",
      createdAt: iso(3, 11),
    },
  ],
  applications2: [],
  consents: [
    { id: "consent-0001", userId: DEMO_MODERATOR_USER_ID, version: "1.0", purpose: "identity_verification", createdAt: iso(3, 10) },
    { id: "consent-0004", userId: DEMO_MODERATOR_USER_ID, version: "1.0", purpose: "location", createdAt: iso(1, 20) },
  ],
  requests: buildRequests(),
  locations: buildLocations(),
  ips: buildIps(),
  audit: buildAudit(),
  admins: [
    { id: "admin-1", userId: DEMO_ADMIN_USER_ID, fullName: "Архат Админ", role: "super_admin", isActive: true },
  ],
  settings: {
    documentRetentionDays: 30,
    weeklyVerificationEnabled: true,
    weeklyIntervalDays: 7,
    consentVersion: "1.0",
  },
  documentBlobs: new Map(),
  sessions: new Map(),
};

const g = globalThis as unknown as { __arhatDemoStore?: SeedData };
export const demoStore: SeedData = g.__arhatDemoStore ?? (g.__arhatDemoStore = seed);

export function uid(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}-${rand}`;
}

/* ================= Mutations ================= */

export function demoAudit(action: string, actionLabel: string, targetType?: string | null, targetId?: string | null) {
  demoStore.audit.unshift({
    id: uid("aud"),
    adminName: "Архат Админ",
    action,
    actionLabel,
    targetType: targetType ?? null,
    targetId: targetId ?? null,
    createdAt: new Date().toISOString(),
  });
}

export function demoSaveSession(session: DemoSession, token: string) {
  demoStore.sessions.set(token, session);
}

export function demoGetSession(token: string): DemoSession | null {
  return demoStore.sessions.get(token) ?? null;
}

export function demoRemoveSession(token: string) {
  demoStore.sessions.delete(token);
}

export function demoStats(): AdminStats {
  const moderators = demoStore.moderators;
  const groups = demoStore.groups;
  const requests = demoStore.requests;
  return {
    totalModerators: moderators.length,
    verifiedModerators: moderators.filter((m) => m.verificationStatus === "approved").length,
    pendingVerification: requests.filter((r) => r.status === "pending").length,
    rejectedVerification: requests.filter((r) => r.status === "rejected").length,
    totalGroups: groups.length,
    totalMembers: groups.reduce((acc, grp) => acc + grp.memberCount, 0),
    recentApplications: demoStore.applications.slice(0, 5),
    weeklyOverview: demoStore.ips.slice(0, 8),
    verificationActivity: [
      { date: iso(6), count: 3 },
      { date: iso(5), count: 2 },
      { date: iso(4), count: 4 },
      { date: iso(3), count: 1 },
      { date: iso(2), count: 5 },
      { date: iso(1), count: 4 },
      { date: iso(0), count: 2 },
    ],
  };
}

export function demoWeeklyStatus(userId: string): WeeklyStatus {
  const settings = demoStore.settings;
  const mine = demoStore.ips.filter((i) => i.userId === userId);
  const last = mine[0] ?? null;
  let due = false;
  let next: string | null = null;
  if (settings.weeklyVerificationEnabled) {
    next = last?.nextVerificationAt ?? addDaysISO(settings.weeklyIntervalDays);
    due = !last || new Date(next).getTime() <= Date.now();
  }
  return {
    verified: Boolean(last && !due),
    lastVerificationAt: last?.createdAt ?? null,
    nextVerificationAt: next,
    due,
    enabled: settings.weeklyVerificationEnabled,
    history: mine.slice(0, 20),
  };
}

export function demoPerformWeekly(
  userId: string,
  moderatorName: string,
  ip: string,
  location: { latitude: number | null; longitude: number | null; accuracy: number | null } | null,
  consentId: string | null
): { status: "verified"; nextVerificationAt: string } {
  const settings = demoStore.settings;
  const next = addDaysISO(settings.weeklyIntervalDays);
  demoStore.ips.unshift({
    id: uid("ip"),
    userId,
    moderatorName,
    ip,
    eventType: "weekly",
    status: "verified",
    nextVerificationAt: next,
    createdAt: new Date().toISOString(),
  });
  if (location && location.latitude !== null && location.longitude !== null && location.latitude !== undefined && location.longitude !== undefined) {
    demoStore.locations.unshift({
      id: uid("loc"),
      userId,
      moderatorName,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy ?? null,
      isCoarse: true,
      consentId,
      kind: "weekly",
      createdAt: new Date().toISOString(),
    });
  }
  const mod = demoStore.moderators.find((m) => m.userId === userId);
  if (mod) {
    mod.lastWeeklyVerificationAt = new Date().toISOString();
    mod.nextWeeklyVerificationAt = next;
  }
  return { status: "verified", nextVerificationAt: next };
}

/** Location share — 7 хоногийн expires_at-тай 'share' бичлэг нэмнэ */
export function demoShareLocation(
  userId: string,
  moderatorName: string,
  loc: { latitude: number; longitude: number; accuracy: number | null }
): LocationRecord {
  const sharedAt = new Date().toISOString();
  const record: LocationRecord = {
    id: uid("loc"),
    userId,
    moderatorName,
    latitude: loc.latitude,
    longitude: loc.longitude,
    accuracy: loc.accuracy ?? null,
    isCoarse: true,
    consentId: null,
    kind: "share",
    createdAt: sharedAt,
    sharedAt,
    expiresAt: addDaysISO(7),
  };
  demoStore.locations.unshift(record);
  const mod = demoStore.moderators.find((m) => m.userId === userId);
  if (mod) mod.locationStatus = "verified";
  return record;
}

/** Хэрэглэгчийн идэвхтэй (7 хоног болоогүй) хамгийн сүүлийн 'share' байршил */
export function demoGetLatestActiveLocation(userId: string): LocationRecord | null {
  const nowMs = Date.now();
  const mine = demoStore.locations.filter(
    (l) => l.userId === userId && l.kind === "share"
  );
  mine.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return (
    mine.find((l) => {
      const exp = l.expiresAt ? new Date(l.expiresAt).getTime() : Infinity;
      return exp > nowMs;
    }) ?? null
  );
}

/** Admin: хэрэглэгч бүрийн хамгийн сүүлийн ИДЭВХТЭЙ location (expired-г оруулахгүй) */
export function demoListActiveLocations(): ActiveLocationShare[] {
  const nowMs = Date.now();
  const sorted = [...demoStore.locations]
    .filter((l) => l.kind === "share" && l.userId !== null)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const byUser = new Map<string, LocationRecord>();
  for (const l of sorted) {
    if (l.userId && !byUser.has(l.userId)) byUser.set(l.userId, l);
  }
  return [...byUser.values()]
    .filter((l) => {
      const exp = l.expiresAt ? new Date(l.expiresAt).getTime() : Infinity;
      return exp > nowMs;
    })
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .map((l) => ({
      id: l.id,
      userId: l.userId,
      moderatorName: l.moderatorName,
      latitude: l.latitude,
      longitude: l.longitude,
      accuracy: l.accuracy,
      sharedAt: l.sharedAt ?? l.createdAt,
      expiresAt: l.expiresAt ?? "",
      isExpired: false,
    }));
}

/** Cron cleanup: demo-д expired location-уудыг санах ойноос арилгаж, count буцаана */
export function demoMarkExpiredLocations(): { deleted: number; remaining: number } {
  const nowMs = Date.now();
  const before = demoStore.locations.length;
  demoStore.locations = demoStore.locations.filter((l) => {
    if (l.kind !== "share") return true;
    const exp = l.expiresAt ? new Date(l.expiresAt).getTime() : Infinity;
    return exp > nowMs;
  });
  return { deleted: before - demoStore.locations.length, remaining: demoStore.locations.length };
}

/* ================= Moderator application (анкет) ================= */

export function demoCreateModeratorApplication(userId: string): ModeratorApplicationData | null {
  if (demoStore.applications2.some((a) => a.userId === userId && a.status === "draft")) {
    return null;
  }
  const now = new Date().toISOString();
  const app: ModeratorApplicationData = {
    id: uid("mapp"),
    userId,
    fullName: "",
    facebookLink: "",
    phoneNumbers: [],
    idCardFrontUrls: [],
    idCardBackUrls: [],
    selfieFaceUrl: null,
    faceMatchStatus: "pending",
    documentScanStatus: "pending",
    faceMatchScore: null,
    documentScanScore: null,
    father: { name: "", phone: "", facebookLink: "" },
    mother: { name: "", phone: "", facebookLink: "" },
    bankAccounts: [],
    currentAddressMapsLink: null,
    addressHistory: [],
    vpnDetected: false,
    status: "draft",
    verificationNotes: null,
    submittedAt: null,
    approvedAt: null,
    approvedBy: null,
    createdAt: now,
    updatedAt: now,
  };
  demoStore.applications2.unshift(app);
  return app;
}

export function demoGetModeratorApplicationForUser(
  userId: string,
  statuses: ModeratorApplicationData["status"][] = ["draft", "editable"]
): ModeratorApplicationData | null {
  return (
    demoStore.applications2.find(
      (a) => a.userId === userId && statuses.includes(a.status)
    ) ?? null
  );
}

export function demoGetModeratorApplicationById(
  id: string
): ModeratorApplicationData | null {
  return demoStore.applications2.find((a) => a.id === id) ?? null;
}

/** Хэрэглэгчийн хамгийн сүүлийн анкет (дурын төлөв) — approved-ыг илрүүлэхэд ашиглана */
export function demoGetModeratorApplicationByUser(
  userId: string
): ModeratorApplicationData | null {
  return demoStore.applications2.find((a) => a.userId === userId) ?? null;
}

export function demoUpdateApplicationImages(
  userId: string,
  appId: string,
  patch: {
    frontUrls?: string[];
    backUrls?: string[];
    selfieUrl?: string | null;
  }
): ModeratorApplicationData | null {
  const app = demoStore.applications2.find((a) => a.id === appId && a.userId === userId);
  if (!app) return null;
  if (patch.frontUrls) app.idCardFrontUrls = patch.frontUrls;
  if (patch.backUrls) app.idCardBackUrls = patch.backUrls;
  if (patch.selfieUrl !== undefined) app.selfieFaceUrl = patch.selfieUrl;
  app.updatedAt = new Date().toISOString();
  return app;
}

export interface DemoSubmitApplicationPayload {
  fullName: string;
  facebookLink: string;
  phoneNumbers: string[];
  idCardFrontUrls: string[];
  idCardBackUrls: string[];
  selfieFaceUrl: string;
  father: { name: string; phone: string; facebookLink: string };
  mother: { name: string; phone: string; facebookLink: string };
  bankAccounts: { bankName: string; accountNumber: string }[];
  mapsLink: string;
  vpnDetected: boolean;
}

export function demoSubmitModeratorApplication(
  userId: string,
  payload: DemoSubmitApplicationPayload
): ModeratorApplicationData | null {
  const app = demoGetModeratorApplicationForUser(userId);
  if (!app) return null;
  const now = new Date().toISOString();
  app.fullName = payload.fullName;
  app.facebookLink = payload.facebookLink;
  app.phoneNumbers = payload.phoneNumbers;
  app.idCardFrontUrls = payload.idCardFrontUrls;
  app.idCardBackUrls = payload.idCardBackUrls;
  app.selfieFaceUrl = payload.selfieFaceUrl;
  app.father = payload.father;
  app.mother = payload.mother;
  app.bankAccounts = payload.bankAccounts;
  app.currentAddressMapsLink = payload.mapsLink;
  const history = app.addressHistory ?? [];
  history.push({ mapsLink: payload.mapsLink, capturedAt: now });
  app.addressHistory = history;
  app.vpnDetected = payload.vpnDetected;
  // Face/document — клиент-side heuristic тул admin эцсийн шийдвэр гаргана (pending)
  app.faceMatchStatus = "pending";
  app.documentScanStatus = "pending";
  app.verificationNotes = payload.vpnDetected
    ? "VPN илэрсэн — admin хянан шалгах шаардлагатай."
    : null;
  app.status = "submitted";
  app.submittedAt = now;
  app.updatedAt = now;
  return app;
}

export function demoListModeratorApplications(): ModeratorApplicationData[] {
  return [...demoStore.applications2].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export function demoSetModeratorApplicationStatus(
  adminId: string,
  appId: string,
  decision: "approve" | "reject" | "editable",
  notes?: string
): ModeratorApplicationData | null {
  const app = demoStore.applications2.find((a) => a.id === appId);
  if (!app) return null;
  const now = new Date().toISOString();
  if (decision === "approve") {
    app.status = "approved";
    app.approvedAt = now;
    app.approvedBy = adminId;
    app.verificationNotes = notes?.trim() || app.verificationNotes;
  } else if (decision === "reject") {
    app.status = "rejected";
    app.verificationNotes = notes?.trim() || app.verificationNotes;
  } else if (decision === "editable") {
    app.status = "editable";
    app.verificationNotes = notes?.trim() || app.verificationNotes;
  }
  app.updatedAt = now;
  return app;
}

export function demoUpdateRequest(
  requestId: string,
  patch: Partial<Pick<VerificationRequest, "status" | "rejectReason" | "rejectNote" | "reviewedAt" | "reviewedBy" | "submittedAt" | "faceResult" | "locationStatus" | "moderatorId" | "consentId" | "documentType">>
) {
  const req = demoStore.requests.find((r) => r.id === requestId);
  if (!req) return null;
  Object.assign(req, patch);
  return req;
}

export function demoAddDocument(
  requestId: string,
  doc: Omit<VerificationDocument, "id" | "requestId" | "createdAt" | "status">
): VerificationDocument | null {
  const req = demoStore.requests.find((r) => r.id === requestId);
  if (!req) return null;
  const full: VerificationDocument = {
    ...doc,
    id: uid("doc"),
    requestId,
    status: "uploaded",
    createdAt: new Date().toISOString(),
  };
  req.documents.push(full);
  return full;
}

export function demoRequestStatusToModerator() {
  // demo: moderator бүрийн ХАМГИЙН СҮҮЛИЙН request-ын status-ийг sync хийнэ
  const processed = new Set<string>();
  const sorted = [...demoStore.requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const req of sorted) {
    if (!req.moderatorId || processed.has(req.moderatorId)) continue;
    processed.add(req.moderatorId);
    const mod = demoStore.moderators.find((m) => m.id === req.moderatorId);
    if (!mod) continue;
    if (req.status === "pending" || req.status === "draft" || req.status === "resubmit_requested") {
      mod.verificationStatus = "pending";
    }
    if (req.status === "approved") {
      mod.verificationStatus = "approved";
      mod.verifiedAt = req.reviewedAt ?? mod.verifiedAt;
    }
    if (req.status === "rejected") mod.verificationStatus = "rejected";
  }
}

export type { DemoSession };
