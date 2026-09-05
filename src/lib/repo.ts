import { createAnonClient, createServiceClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo-mode";
import { demoStore } from "@/lib/demo/store";
import {
  demoAddDocument,
  demoAudit,
  demoCreateModeratorApplication,
  demoGetLatestActiveLocation,
  demoGetModeratorApplicationById,
  demoGetModeratorApplicationByUser,
  demoGetModeratorApplicationForUser,
  demoListActiveLocations,
  demoListModeratorApplications,
  demoMarkExpiredLocations,
  demoPerformWeekly,
  demoRequestStatusToModerator,
  demoSetModeratorApplicationStatus,
  demoShareLocation,
  demoStats,
  demoSubmitModeratorApplication,
  demoUpdateApplicationImages,
  demoUpdateRequest,
  demoWeeklyStatus,
  uid,
} from "@/lib/demo/store";
import { addDaysISO, formatDate } from "@/lib/utils";
import type {
  ActiveLocationShare,
  AddressHistoryEntry,
  AuditEntry,
  BankAccountInput,
  FaceCheckResult,
  Group,
  IpHistoryEntry,
  LocationRecord,
  Moderator,
  ModeratorApplication,
  ModeratorApplicationData,
  ModeratorAppStatus,
  ParentInfo,
  PaymentAccount,
  PlatformSettings,
  PublicModerator,
  RejectReason,
  RequestStatus,
  ServicePrice,
  VerificationDocument,
  VerificationRequest,
  WeeklyStatus,
} from "@/types";

/**
 * Repository layer — бүх data access энд төвлөрнө.
 * Demo горимд in-memory store, production-д Supabase (RLS-тэй).
 */

/* ==================== Helpers ==================== */

function toPublic(m: Moderator): PublicModerator {
  const { address: _a, parentPhone: _p, userId: _u, ...rest } = m;
  return rest;
}

const FACE_OK: FaceCheckResult = {
  passed: true,
  livenessPassed: true,
  checks: { faceDetected: true, singleFace: true, lightingOk: true, centered: true, stepsCompleted: 4 },
  note: null,
};

/* ==================== PUBLIC ==================== */

export async function getPublicModerators(): Promise<PublicModerator[]> {
  if (isDemoMode()) {
    return demoStore.moderators.filter((m) => m.isPublic && m.isActive).map(toPublic);
  }
  const sb = await createAnonClient();
  const { data, error } = await sb
    .from("moderators")
    .select("*, moderator_groups(groups(*))")
    .eq("is_public", true)
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapModerator).filter((m): m is Moderator => m !== null).map(toPublic);
}

export async function getPublicModerator(id: string): Promise<PublicModerator | null> {
  if (isDemoMode()) {
    const m = demoStore.moderators.find((x) => x.id === id && x.isPublic);
    return m ? toPublic(m) : null;
  }
  const sb = await createAnonClient();
  const { data, error } = await sb
    .from("moderators")
    .select("*, moderator_groups(groups(*))")
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const m = mapModerator(data);
  return m ? toPublic(m) : null;
}

export async function getActiveGroups(): Promise<Group[]> {
  if (isDemoMode()) {
    return demoStore.groups
      .filter((g) => g.isActive && !g.isHidden)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((g) => ({ ...g, moderators: g.moderators.map((m) => ({ ...m, memberCount: g.memberCount })) }));
  }
  const sb = await createAnonClient();
  const { data, error } = await sb
    .from("groups")
    .select("*, moderator_groups(moderators(*))")
    .eq("is_active", true)
    .eq("is_hidden", false)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapGroup);
}

export async function getActivePrices(): Promise<ServicePrice[]> {
  if (isDemoMode()) {
    return demoStore.prices.filter((p) => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  }
  const sb = await createAnonClient();
  const { data, error } = await sb.from("service_prices").select("*").eq("is_active", true).order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPrice);
}

export async function getActiveAccounts(): Promise<PaymentAccount[]> {
  if (isDemoMode()) {
    return demoStore.accounts.filter((a) => a.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  }
  const sb = await createAnonClient();
  const { data, error } = await sb.from("payment_accounts").select("*").eq("is_active", true).order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapAccount);
}

/* ==================== USER ==================== */

export async function createApplication(
  input: Omit<ModeratorApplication, "id" | "status" | "createdAt">
): Promise<{ id: string }> {
  if (isDemoMode()) {
    const id = uid("app");
    demoStore.applications.unshift({
      ...input,
      id,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    return { id };
  }
  const sb = await createServiceClient();
  const { data, error } = await sb
    .from("applications")
    .insert({
      user_id: input.userId,
      full_name: input.fullName,
      nickname: input.nickname,
      email: input.email,
      phone: input.phone,
      facebook_url: input.facebookUrl,
      groups_text: input.groupsText,
      additional_info: input.additionalInfo,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function getMyApplications(userId: string): Promise<ModeratorApplication[]> {
  if (isDemoMode()) {
    return demoStore.applications.filter((a) => a.userId === userId);
  }
  const sb = await createServiceClient();
  const { data, error } = await sb
    .from("applications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapApplication);
}

export async function getModeratorForUser(userId: string): Promise<Moderator | null> {
  if (isDemoMode()) {
    const m = demoStore.moderators.find((x) => x.userId === userId);
    return m ?? null;
  }
  const sb = await createServiceClient();
  const { data, error } = await sb
    .from("moderators")
    .select("*, moderator_groups(groups(*))")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapModerator(data) : null;
}

export async function updateMyProfile(
  userId: string,
  patch: { nickname?: string; facebookUrl?: string | null; phone?: string | null }
): Promise<void> {
  if (isDemoMode()) {
    const m = demoStore.moderators.find((x) => x.userId === userId);
    if (!m) throw new Error("Moderator олдсонгүй");
    if (patch.nickname) m.nickname = patch.nickname;
    if (patch.facebookUrl !== undefined) m.facebookUrl = patch.facebookUrl || null;
    if (patch.phone !== undefined) m.phone = patch.phone || null;
    return;
  }
  const sb = await createServiceClient();
  const { error } = await sb
    .from("moderators")
    .update({
      nickname: patch.nickname,
      facebook_url: patch.facebookUrl,
      phone: patch.phone,
    })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function createConsent(
  userId: string,
  version: string,
  purpose: "identity_verification" | "weekly_verification" | "location"
): Promise<{ id: string }> {
  if (isDemoMode()) {
    const id = uid("consent");
    demoStore.consents.unshift({ id, userId, version, purpose, createdAt: new Date().toISOString() });
    return { id };
  }
  const sb = await createServiceClient();
  const { data, error } = await sb
    .from("consents")
    .insert({ user_id: userId, consent_version: version, purpose })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id as string };
}

export async function createVerificationRequest(
  userId: string,
  moderator: Moderator | null,
  input: { documentType: "id-card" | "birth-certificate"; consentId: string }
): Promise<{ id: string }> {
  if (isDemoMode()) {
    const id = uid("req");
    demoStore.requests.unshift({
      id,
      userId,
      moderatorId: moderator?.id ?? null,
      fullName: moderator?.fullName ?? "Хэрэглэгч",
      nickname: moderator?.nickname ?? "Хэрэглэгч",
      documentType: input.documentType,
      status: "draft",
      rejectReason: null,
      rejectNote: null,
      consentId: input.consentId,
      faceResult: null,
      locationStatus: "none",
      submittedAt: null,
      reviewedAt: null,
      reviewedBy: null,
      createdAt: new Date().toISOString(),
      documents: [],
    });
    if (moderator) moderator.verificationStatus = "pending";
    return { id };
  }
  const sb = await createServiceClient();
  const { data, error } = await sb
    .from("verification_requests")
    .insert({
      user_id: userId,
      moderator_id: moderator?.id ?? null,
      document_type: input.documentType,
      consent_id: input.consentId,
      status: "draft",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  if (moderator) {
    await sb.from("moderators").update({ verification_status: "pending" }).eq("id", moderator.id);
  }
  return { id: data.id as string };
}

export async function getMyVerifications(userId: string): Promise<VerificationRequest[]> {
  if (isDemoMode()) {
    return demoStore.requests.filter((r) => r.userId === userId);
  }
  const sb = await createServiceClient();
  const { data, error } = await sb
    .from("verification_requests")
    .select("*, verification_documents(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRequest);
}

export async function getVerificationById(id: string): Promise<VerificationRequest | null> {
  if (isDemoMode()) {
    return demoStore.requests.find((r) => r.id === id) ?? null;
  }
  const sb = await createServiceClient();
  const { data, error } = await sb
    .from("verification_requests")
    .select("*, verification_documents(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRequest(data) : null;
}

export async function addVerificationDocument(
  requestId: string,
  doc: {
    documentType: "id-card" | "birth-certificate" | "face";
    objectKey: string;
    fileSize: number;
    contentType: string;
    faceResult?: FaceCheckResult | null;
  }
): Promise<VerificationDocument | null> {
  if (isDemoMode()) {
    const added = demoAddDocument(requestId, {
      userId: null,
      documentType: doc.documentType,
      objectKey: doc.objectKey,
      fileSize: doc.fileSize,
      contentType: doc.contentType,
      retentionUntil: addDaysISO(demoStore.settings.documentRetentionDays),
    });
    if (added && doc.faceResult) {
      const req = demoStore.requests.find((r) => r.id === requestId);
      if (req) req.faceResult = doc.faceResult;
    }
    return added;
  }
  const sb = await createServiceClient();
  const req = await getVerificationById(requestId);
  const settings = await getSettings();
  const { data, error } = await sb
    .from("verification_documents")
    .insert({
      request_id: requestId,
      user_id: req?.userId ?? null,
      document_type: doc.documentType,
      object_key: doc.objectKey,
      file_size: doc.fileSize,
      content_type: doc.contentType,
      retention_until: addDaysISO(settings.documentRetentionDays),
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  if (doc.faceResult && req) {
    await sb
      .from("verification_requests")
      .update({ face_result: doc.faceResult })
      .eq("id", requestId);
  }
  return mapDocument(data);
}

export async function submitVerification(
  requestId: string,
  extra: { locationStatus: "none" | "verified" | "denied" | "unavailable"; locationConsentId?: string | null }
): Promise<void> {
  if (isDemoMode()) {
    demoUpdateRequest(requestId, {
      status: "pending",
      submittedAt: new Date().toISOString(),
      locationStatus: extra.locationStatus,
    });
    demoRequestStatusToModerator();
    return;
  }
  const sb = await createServiceClient();
  const { error } = await sb
    .from("verification_requests")
    .update({ status: "pending", submitted_at: new Date().toISOString(), location_status: extra.locationStatus })
    .eq("id", requestId);
  if (error) throw new Error(error.message);
  const req = await getVerificationById(requestId);
  if (req?.moderatorId) {
    await sb.from("moderators").update({ verification_status: "pending" }).eq("id", req.moderatorId);
  }
}

export async function addLocationRecord(
  userId: string,
  moderatorName: string,
  loc: { latitude: number; longitude: number; accuracy: number | null },
  kind: "identity" | "weekly",
  consentId: string | null
): Promise<void> {
  if (isDemoMode()) {
    demoStore.locations.unshift({
      id: uid("loc"),
      userId,
      moderatorName,
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy,
      isCoarse: true,
      consentId,
      kind,
      createdAt: new Date().toISOString(),
    });
    return;
  }
  const sb = await createServiceClient();
  const { error } = await sb.from("location_verifications").insert({
    user_id: userId,
    latitude: loc.latitude,
    longitude: loc.longitude,
    accuracy: loc.accuracy,
    is_coarse: true,
    consent_id: consentId,
    kind,
  });
  if (error) throw new Error(error.message);
}

export async function getWeeklyStatus(userId: string): Promise<WeeklyStatus> {
  if (isDemoMode()) return demoWeeklyStatus(userId);
  const sb = await createServiceClient();
  const settings = await getSettings();
  const { data, error } = await sb
    .from("ip_verification_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const history = (data ?? []).map(mapIp);
  const last = history[0] ?? null;
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
    history,
  };
}

export async function performWeekly(
  userId: string,
  moderatorName: string,
  ip: string,
  location: { latitude: number | null; longitude: number | null; accuracy: number | null } | null,
  consentId: string | null
): Promise<{ status: string; nextVerificationAt: string }> {
  if (isDemoMode()) {
    return demoPerformWeekly(userId, moderatorName, ip, location, consentId);
  }
  const sb = await createServiceClient();
  const settings = await getSettings();
  const next = addDaysISO(settings.weeklyIntervalDays);
  const { error } = await sb.from("ip_verification_history").insert({
    user_id: userId,
    ip_address: ip,
    event_type: "weekly",
    status: "verified",
    next_verification_at: next,
  });
  if (error) throw new Error(error.message);
  if (location?.latitude && location?.longitude) {
    await addLocationRecord(userId, moderatorName, { latitude: location.latitude, longitude: location.longitude, accuracy: location.accuracy }, "weekly", consentId);
  }
  await sb
    .from("moderators")
    .update({ last_weekly_verification_at: new Date().toISOString(), next_weekly_verification_at: next })
    .eq("user_id", userId);
  return { status: "verified", nextVerificationAt: next };
}

/* ==================== ADMIN ==================== */

export async function getAdminStats() {
  if (isDemoMode()) return demoStats();
  const sb = await createServiceClient();
  const [mods, groups, reqs, apps, ips] = await Promise.all([
    sb.from("moderators").select("verification_status, is_active"),
    sb.from("groups").select("member_count"),
    sb.from("verification_requests").select("status"),
    sb.from("applications").select("*").order("created_at", { ascending: false }).limit(5),
    sb.from("ip_verification_history").select("*").order("created_at", { ascending: false }).limit(8),
  ]);
  const moderators = mods.data ?? [];
  const requests = reqs.data ?? [];
  return {
    totalModerators: moderators.length,
    verifiedModerators: moderators.filter((m) => m.verification_status === "approved").length,
    pendingVerification: requests.filter((r) => r.status === "pending").length,
    rejectedVerification: requests.filter((r) => r.status === "rejected").length,
    totalGroups: groups.data?.length ?? 0,
    totalMembers: (groups.data ?? []).reduce((acc, g) => acc + Number(g.member_count ?? 0), 0),
    recentApplications: (apps.data ?? []).map(mapApplication),
    weeklyOverview: (ips.data ?? []).map(mapIp),
    verificationActivity: [{ date: new Date().toISOString(), count: 0 }],
  };
}

export async function listAllModerators(): Promise<Moderator[]> {
  if (isDemoMode()) return demoStore.moderators;
  const sb = await createServiceClient();
  const { data, error } = await sb
    .from("moderators")
    .select("*, moderator_groups(groups(*))")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapModerator).filter((m): m is Moderator => m !== null);
}

export async function updateModeratorAdmin(
  id: string,
  patch: {
    fullName?: string;
    nickname?: string;
    facebookUrl?: string | null;
    phone?: string | null;
    locationText?: string | null;
    isPublic?: boolean;
    isActive?: boolean;
    groupIds?: string[];
  }
): Promise<void> {
  if (isDemoMode()) {
    const m = demoStore.moderators.find((x) => x.id === id);
    if (!m) throw new Error("Moderator олдсонгүй");
    if (patch.fullName) m.fullName = patch.fullName;
    if (patch.nickname) m.nickname = patch.nickname;
    if (patch.facebookUrl !== undefined) m.facebookUrl = patch.facebookUrl;
    if (patch.phone !== undefined) m.phone = patch.phone;
    if (patch.locationText !== undefined) m.locationText = patch.locationText;
    if (patch.isPublic !== undefined) m.isPublic = patch.isPublic;
    if (patch.isActive !== undefined) m.isActive = patch.isActive;
    if (patch.groupIds) {
      m.groups = patch.groupIds.map((gid) => {
        const g = demoStore.groups.find((x) => x.id === gid);
        return { id: gid, name: g?.name ?? "?", memberCount: g?.memberCount ?? 0, isActive: g?.isActive ?? false };
      });
    }
    demoAudit("moderator.update", "Moderator мэдээлэл зассан", "moderator", id);
    return;
  }
  const sb = await createServiceClient();
  const { error } = await sb
    .from("moderators")
    .update({
      full_name: patch.fullName,
      nickname: patch.nickname,
      facebook_url: patch.facebookUrl,
      phone: patch.phone,
      location_text: patch.locationText,
      is_public: patch.isPublic,
      is_active: patch.isActive,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  if (patch.groupIds) {
    await sb.from("moderator_groups").delete().eq("moderator_id", id);
    const rows = patch.groupIds.map((gid) => ({ moderator_id: id, group_id: gid }));
    if (rows.length) await sb.from("moderator_groups").insert(rows);
  }
}

/* ---- Groups ---- */

export async function listGroupsAdmin(): Promise<Group[]> {
  if (isDemoMode()) return [...demoStore.groups].sort((a, b) => a.sortOrder - b.sortOrder);
  const sb = await createServiceClient();
  const { data, error } = await sb.from("groups").select("*, moderator_groups(moderators(*))").order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapGroup);
}

export async function createGroup(
  input: { name: string; facebookUrl?: string; memberCount: number; description?: string; price?: number; isActive: boolean },
  adminName: string
): Promise<void> {
  if (isDemoMode()) {
    demoStore.groups.push({
      id: uid("grp"),
      name: input.name,
      imageUrl: null,
      facebookUrl: input.facebookUrl || null,
      memberCount: input.memberCount,
      description: input.description || null,
      price: input.price ?? null,
      isActive: input.isActive,
      isHidden: false,
      sortOrder: demoStore.groups.length + 1,
      createdAt: new Date().toISOString(),
      moderators: [],
    });
    demoAudit("group.create", "Group нэмсэн", "group", null);
    return;
  }
  const sb = await createServiceClient();
  const { error } = await sb.from("groups").insert({
    name: input.name,
    facebook_url: input.facebookUrl,
    member_count: input.memberCount,
    description: input.description,
    price: input.price,
    is_active: input.isActive,
  });
  if (error) throw new Error(error.message);
  await adminAudit("group.create", "Group нэмсэн", "group", null, adminName);
}

export async function updateGroup(
  id: string,
  input: { name?: string; facebookUrl?: string | null; memberCount?: number; description?: string | null; price?: number | null; isActive?: boolean; isHidden?: boolean },
  adminName: string
): Promise<void> {
  if (isDemoMode()) {
    const g = demoStore.groups.find((x) => x.id === id);
    if (!g) throw new Error("Group олдсонгүй");
    Object.assign(g, {
      name: input.name ?? g.name,
      facebookUrl: input.facebookUrl !== undefined ? input.facebookUrl : g.facebookUrl,
      memberCount: input.memberCount ?? g.memberCount,
      description: input.description !== undefined ? input.description : g.description,
      price: input.price !== undefined ? input.price : g.price,
      isActive: input.isActive ?? g.isActive,
      isHidden: input.isHidden ?? g.isHidden,
    });
    demoAudit("group.update", "Group зассан", "group", id);
    return;
  }
  const sb = await createServiceClient();
  const { error } = await sb.from("groups").update({
    name: input.name,
    facebook_url: input.facebookUrl,
    member_count: input.memberCount,
    description: input.description,
    price: input.price,
    is_active: input.isActive,
    is_hidden: input.isHidden,
  }).eq("id", id);
  if (error) throw new Error(error.message);
  await adminAudit("group.update", "Group зассан", "group", id, adminName);
}

export async function deleteGroup(id: string, adminName: string): Promise<void> {
  if (isDemoMode()) {
    demoStore.groups = demoStore.groups.filter((g) => g.id !== id);
    demoAudit("group.delete", "Group устгасан", "group", id);
    return;
  }
  const sb = await createServiceClient();
  await sb.from("moderator_groups").delete().eq("group_id", id);
  const { error } = await sb.from("groups").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await adminAudit("group.delete", "Group устгасан", "group", id, adminName);
}

export async function reorderGroup(id: string, direction: "up" | "down"): Promise<void> {
  if (isDemoMode()) {
    const list = [...demoStore.groups].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = list.findIndex((g) => g.id === id);
    const swap = direction === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swap < 0 || swap >= list.length) return;
    const tmp = list[idx]!.sortOrder;
    list[idx]!.sortOrder = list[swap]!.sortOrder;
    list[swap]!.sortOrder = tmp;
    return;
  }
  const sb = await createServiceClient();
  const list = await listGroupsAdmin();
  const idx = list.findIndex((g) => g.id === id);
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swap < 0 || swap >= list.length) return;
  await sb.from("groups").update({ sort_order: list[swap]!.sortOrder }).eq("id", list[idx]!.id);
  await sb.from("groups").update({ sort_order: list[idx]!.sortOrder }).eq("id", list[swap]!.id);
}

/* ---- Prices ---- */

export async function listPricesAdmin(): Promise<ServicePrice[]> {
  if (isDemoMode()) return [...demoStore.prices].sort((a, b) => a.sortOrder - b.sortOrder);
  const sb = await createServiceClient();
  const { data, error } = await sb.from("service_prices").select("*").order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPrice);
}

export async function createPrice(
  input: { title: string; durationMonths: number; price: number; description?: string; isActive: boolean },
  adminName: string
): Promise<void> {
  if (isDemoMode()) {
    demoStore.prices.push({ id: uid("price"), sortOrder: demoStore.prices.length + 1, description: input.description || null, ...input });
    demoAudit("price.create", "Үнэ нэмсэн", "service_price", null);
    return;
  }
  const sb = await createServiceClient();
  const { error } = await sb.from("service_prices").insert({
    title: input.title,
    duration_months: input.durationMonths,
    price: input.price,
    description: input.description,
    is_active: input.isActive,
  });
  if (error) throw new Error(error.message);
  await adminAudit("price.create", "Үнэ нэмсэн", "service_price", null, adminName);
}

export async function updatePrice(
  id: string,
  input: { title?: string; durationMonths?: number; price?: number; description?: string | null; isActive?: boolean },
  adminName: string
): Promise<void> {
  if (isDemoMode()) {
    const p = demoStore.prices.find((x) => x.id === id);
    if (!p) throw new Error("Үнэ олдсонгүй");
    Object.assign(p, {
      title: input.title ?? p.title,
      durationMonths: input.durationMonths ?? p.durationMonths,
      price: input.price ?? p.price,
      description: input.description !== undefined ? input.description : p.description,
      isActive: input.isActive ?? p.isActive,
    });
    demoAudit("price.update", "Үнэ өөрчилсөн", "service_price", id);
    return;
  }
  const sb = await createServiceClient();
  const { error } = await sb.from("service_prices").update({
    title: input.title,
    duration_months: input.durationMonths,
    price: input.price,
    description: input.description,
    is_active: input.isActive,
  }).eq("id", id);
  if (error) throw new Error(error.message);
  await adminAudit("price.update", "Үнэ өөрчилсөн", "service_price", id, adminName);
}

export async function deletePrice(id: string, adminName: string): Promise<void> {
  if (isDemoMode()) {
    demoStore.prices = demoStore.prices.filter((p) => p.id !== id);
    demoAudit("price.delete", "Үнэ устгасан", "service_price", id);
    return;
  }
  const sb = await createServiceClient();
  const { error } = await sb.from("service_prices").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await adminAudit("price.delete", "Үнэ устгасан", "service_price", id, adminName);
}

export async function reorderPrice(id: string, direction: "up" | "down"): Promise<void> {
  if (isDemoMode()) {
    const list = [...demoStore.prices].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = list.findIndex((g) => g.id === id);
    const swap = direction === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swap < 0 || swap >= list.length) return;
    const tmp = list[idx]!.sortOrder;
    list[idx]!.sortOrder = list[swap]!.sortOrder;
    list[swap]!.sortOrder = tmp;
    return;
  }
  const sb = await createServiceClient();
  const list = await listPricesAdmin();
  const idx = list.findIndex((p) => p.id === id);
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swap < 0 || swap >= list.length) return;
  await sb.from("service_prices").update({ sort_order: list[swap]!.sortOrder }).eq("id", list[idx]!.id);
  await sb.from("service_prices").update({ sort_order: list[idx]!.sortOrder }).eq("id", list[swap]!.id);
}

/* ---- Payment accounts ---- */

export async function listAccountsAdmin(): Promise<PaymentAccount[]> {
  if (isDemoMode()) return [...demoStore.accounts].sort((a, b) => a.sortOrder - b.sortOrder);
  const sb = await createServiceClient();
  const { data, error } = await sb.from("payment_accounts").select("*").order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapAccount);
}

export async function createAccount(
  input: { bankName: string; accountHolder: string; accountNumber: string; note?: string; isActive: boolean },
  adminName: string
): Promise<void> {
  if (isDemoMode()) {
    demoStore.accounts.push({
      id: uid("acc"),
      sortOrder: demoStore.accounts.length + 1,
      note: input.note || null,
      createdAt: new Date().toISOString(),
      ...input,
    });
    demoAudit("account.create", "Банкны данс нэмсэн", "payment_account", null);
    return;
  }
  const sb = await createServiceClient();
  const { error } = await sb.from("payment_accounts").insert({
    bank_name: input.bankName,
    account_holder: input.accountHolder,
    account_number: input.accountNumber,
    note: input.note,
    is_active: input.isActive,
  });
  if (error) throw new Error(error.message);
  await adminAudit("account.create", "Банкны данс нэмсэн", "payment_account", null, adminName);
}

export async function updateAccount(
  id: string,
  input: { bankName?: string; accountHolder?: string; accountNumber?: string; note?: string | null; isActive?: boolean },
  adminName: string
): Promise<void> {
  if (isDemoMode()) {
    const a = demoStore.accounts.find((x) => x.id === id);
    if (!a) throw new Error("Данс олдсонгүй");
    Object.assign(a, {
      bankName: input.bankName ?? a.bankName,
      accountHolder: input.accountHolder ?? a.accountHolder,
      accountNumber: input.accountNumber ?? a.accountNumber,
      note: input.note !== undefined ? input.note : a.note,
      isActive: input.isActive ?? a.isActive,
    });
    demoAudit("account.update", "Банкны данс зассан", "payment_account", id);
    return;
  }
  const sb = await createServiceClient();
  const { error } = await sb.from("payment_accounts").update({
    bank_name: input.bankName,
    account_holder: input.accountHolder,
    account_number: input.accountNumber,
    note: input.note,
    is_active: input.isActive,
  }).eq("id", id);
  if (error) throw new Error(error.message);
  await adminAudit("account.update", "Банкны данс зассан", "payment_account", id, adminName);
}

export async function deleteAccount(id: string, adminName: string): Promise<void> {
  if (isDemoMode()) {
    demoStore.accounts = demoStore.accounts.filter((a) => a.id !== id);
    demoAudit("account.delete", "Банкны данс устгасан", "payment_account", id);
    return;
  }
  const sb = await createServiceClient();
  const { error } = await sb.from("payment_accounts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await adminAudit("account.delete", "Банкны данс устгасан", "payment_account", id, adminName);
}

export async function reorderAccount(id: string, direction: "up" | "down"): Promise<void> {
  if (isDemoMode()) {
    const list = [...demoStore.accounts].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = list.findIndex((g) => g.id === id);
    const swap = direction === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swap < 0 || swap >= list.length) return;
    const tmp = list[idx]!.sortOrder;
    list[idx]!.sortOrder = list[swap]!.sortOrder;
    list[swap]!.sortOrder = tmp;
    return;
  }
  const sb = await createServiceClient();
  const list = await listAccountsAdmin();
  const idx = list.findIndex((a) => a.id === id);
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swap < 0 || swap >= list.length) return;
  await sb.from("payment_accounts").update({ sort_order: list[swap]!.sortOrder }).eq("id", list[idx]!.id);
  await sb.from("payment_accounts").update({ sort_order: list[idx]!.sortOrder }).eq("id", list[swap]!.id);
}

/* ---- Applications ---- */

export async function listApplicationsAdmin(): Promise<ModeratorApplication[]> {
  if (isDemoMode()) return demoStore.applications;
  const sb = await createServiceClient();
  const { data, error } = await sb.from("applications").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapApplication);
}

export async function decideApplication(
  id: string,
  decision: "approve" | "reject",
  adminName: string
): Promise<void> {
  if (isDemoMode()) {
    const app = demoStore.applications.find((a) => a.id === id);
    if (!app) throw new Error("Өргөдөл олдсонгүй");
    app.status = decision === "approve" ? "approved" : "rejected";
    if (decision === "approve") {
      demoStore.moderators.push({
        id: uid("mod"),
        userId: null,
        fullName: app.fullName,
        nickname: app.nickname,
        avatarUrl: null,
        facebookUrl: app.facebookUrl,
        phone: app.phone,
        locationText: null,
        locationStatus: "none",
        becameModeratorAt: new Date().toISOString(),
        verificationStatus: "unverified",
        verifiedAt: null,
        lastWeeklyVerificationAt: null,
        nextWeeklyVerificationAt: null,
        isActive: true,
        isPublic: true,
        createdAt: new Date().toISOString(),
        groups: [],
      });
    }
    demoAudit(`application.${decision}`, decision === "approve" ? "Өргөдөл зөвшөөрсөн" : "Өргөдөл татгалзсан", "application", id);
    return;
  }
  const sb = await createServiceClient();
  const newStatus = decision === "approve" ? "approved" : "rejected";

  const { data: app, error: fetchError } = await sb
    .from("applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!app) throw new Error("Өргөдөл олдсонгүй");

  const { error } = await sb.from("applications").update({ status: newStatus }).eq("id", id);
  if (error) throw new Error(error.message);

  if (decision === "approve") {
    const { error: modError } = await sb.from("moderators").insert({
      user_id: app.user_id,
      full_name: app.full_name,
      nickname: app.nickname,
      facebook_url: app.facebook_url,
      phone: app.phone,
      became_moderator_at: new Date().toISOString(),
      is_active: true,
      is_public: true,
    });
    if (modError) throw new Error(modError.message);
  }

  await adminAudit(`application.${decision}`, decision === "approve" ? "Өргөдөл зөвшөөрсөн" : "Өргөдөл татгалзсан", "application", id, adminName);
}

/* ---- Verifications ---- */

export async function listVerificationsAdmin(): Promise<VerificationRequest[]> {
  if (isDemoMode()) {
    return [...demoStore.requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const sb = await createServiceClient();
  const { data, error } = await sb
    .from("verification_requests")
    .select("*, verification_documents(*)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRequest);
}

export async function reviewVerification(
  id: string,
  decision: "approve" | "reject" | "resubmit",
  reason: RejectReason | null,
  note: string | null,
  adminName: string
): Promise<void> {
  if (isDemoMode()) {
    demoUpdateRequest(id, {
      status: decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "resubmit_requested",
      rejectReason: decision === "approve" ? null : reason,
      rejectNote: decision === "approve" ? null : note,
      reviewedAt: new Date().toISOString(),
      reviewedBy: adminName,
    });
    demoRequestStatusToModerator();
    demoAudit(
      `verification.${decision}`,
      decision === "approve" ? "Баталгаажуулалт баталсан" : decision === "reject" ? "Баталгаажуулалт татгалзсан" : "Дахин оруулах хүсэлт илгээсэн",
      "verification_request",
      id
    );
    return;
  }
  const sb = await createServiceClient();
  const status: RequestStatus = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "resubmit_requested";
  const { error } = await sb
    .from("verification_requests")
    .update({
      status,
      reject_reason: decision === "approve" ? null : reason,
      reject_note: decision === "approve" ? null : note,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminName,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  const req = await getVerificationById(id);
  if (req?.moderatorId) {
    await sb
      .from("moderators")
      .update({
        verification_status: status === "approved" ? "approved" : status === "rejected" ? "rejected" : "pending",
        verified_at: status === "approved" ? new Date().toISOString() : null,
      })
      .eq("id", req.moderatorId);
  }
  await adminAudit(
    `verification.${decision}`,
    decision === "approve" ? "Баталгаажуулалт баталсан" : decision === "reject" ? "Баталгаажуулалт татгалзсан" : "Дахин оруулах хүсэлт илгээсэн",
    "verification_request",
    id,
    adminName
  );
}

export async function listLocationsAdmin(): Promise<LocationRecord[]> {
  if (isDemoMode()) {
    return [...demoStore.locations].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const sb = await createServiceClient();
  const { data, error } = await sb
    .from("location_verifications")
    .select("*, moderators!left(full_name, nickname)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapLocation);
}

/* ==================== LOCATION SHARE SYSTEM ==================== */

/**
 * Хэрэглэгч browser Geolocation-аас авсан lat/lng-г хадгална.
 * user_id нь ЗӨВХӨН сервер-талын session-ээс гарах ёстой (client-аас биш).
 * expires_at = shared_at + 7 хоног яг.
 */
export async function shareLocation(
  userId: string,
  moderatorName: string,
  loc: { latitude: number; longitude: number; accuracy: number | null }
): Promise<LocationRecord> {
  const sharedAt = new Date().toISOString();
  const expiresAt = addDaysISO(7);
  if (isDemoMode()) {
    return demoShareLocation(userId, moderatorName, loc);
  }
  const sb = await createServiceClient();
  const { data, error } = await sb
    .from("location_verifications")
    .insert({
      user_id: userId,
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy,
      is_coarse: true,
      kind: "share",
      shared_at: sharedAt,
      expires_at: expiresAt,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  // Moderator байвал location_status-г 'verified' болгоно (non-breaking)
  const { error: updErr } = await sb
    .from("moderators")
    .update({ location_status: "verified" })
    .eq("user_id", userId);
  if (updErr) throw new Error(updErr.message);
  return mapLocation(data);
}

/** Тодорхой хэрэглэгчийн идэвхтэй (7 хоног болоогүй) хамгийн сүүлийн location */
export async function getLatestActiveLocation(userId: string): Promise<LocationRecord | null> {
  if (isDemoMode()) return demoGetLatestActiveLocation(userId);
  const sb = await createServiceClient();
  const { data, error } = await sb
    .from("location_verifications")
    .select("*")
    .eq("user_id", userId)
    .eq("kind", "share")
    .gt("expires_at", new Date().toISOString())
    .order("shared_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapLocation(data) : null;
}

/**
 * Admin: хэрэглэгч бүрийн хамгийн сүүлийн ИДЭВХТЭЙ location.
 * Expired (7 хоног хэтэрсэн) location-уудыг харуулахгүй.
 */
export async function listActiveLocationsAdmin(): Promise<ActiveLocationShare[]> {
  if (isDemoMode()) return demoListActiveLocations();
  const sb = await createServiceClient();
  const { data, error } = await sb
    .from("location_verifications")
    .select("*")
    .eq("kind", "share")
    .gt("expires_at", new Date().toISOString())
    .order("shared_at", { ascending: false });
  if (error) throw new Error(error.message);
  // Хэрэглэгч бүрээс хамгийн сүүлийн нэгийг нь сонгох
  const byUser = new Map<string, Row>();
  for (const row of data ?? []) {
    const uidRow = str(row.user_id);
    if (!uidRow) continue;
    if (!byUser.has(uidRow)) byUser.set(uidRow, row);
  }
  return [...byUser.values()].map((row) => {
    const sharedAt = str(row.shared_at) ?? str(row.created_at) ?? new Date().toISOString();
    return {
      id: str(row.id) ?? "",
      userId: str(row.user_id),
      moderatorName: str(row.moderator_name) ?? "Хэрэглэгч",
      latitude: typeof row.latitude === "number" ? row.latitude : null,
      longitude: typeof row.longitude === "number" ? row.longitude : null,
      accuracy: typeof row.accuracy === "number" ? row.accuracy : null,
      sharedAt,
      expiresAt: str(row.expires_at) ?? addDaysISO(7),
      isExpired: false,
    };
  });
}

/** Cron cleanup — expires_at хэтэрсэн 'share' location-уудыг устгана */
export async function markExpiredLocations(): Promise<{ deleted: number; remaining: number }> {
  if (isDemoMode()) return demoMarkExpiredLocations();
  const sb = await createServiceClient();
  // Эхлээд хэдэн expired байгааг тоолох
  const { data: expiredRows, error: countErr } = await sb
    .from("location_verifications")
    .select("id")
    .eq("kind", "share")
    .lte("expires_at", new Date().toISOString());
  if (countErr) throw new Error(countErr.message);
  const ids = (expiredRows ?? []).map((r) => r.id as string);
  if (ids.length > 0) {
    const { error: delErr } = await sb
      .from("location_verifications")
      .delete()
      .in("id", ids);
    if (delErr) throw new Error(delErr.message);
  }
  const { count, error: remErr } = await sb
    .from("location_verifications")
    .select("id", { count: "exact", head: true })
    .eq("kind", "share");
  if (remErr) throw new Error(remErr.message);
  return { deleted: ids.length, remaining: count ?? 0 };
}

export async function listIpsAdmin(): Promise<IpHistoryEntry[]> {
  if (isDemoMode()) {
    return [...demoStore.ips].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const sb = await createServiceClient();
  const { data, error } = await sb
    .from("ip_verification_history")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapIp);
}

export async function listAuditAdmin(): Promise<AuditEntry[]> {
  if (isDemoMode()) return demoStore.audit;
  const sb = await createServiceClient();
  const { data, error } = await sb
    .from("admin_audit_logs")
    .select("*, admin_users(full_name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapAudit);
}

export async function adminAudit(
  action: string,
  actionLabel: string,
  targetType: string | null,
  targetId: string | null,
  adminName: string
): Promise<void> {
  const sb = await createServiceClient();
  const { data: admin } = await sb.from("admin_users").select("id").eq("full_name", adminName).maybeSingle();
  await sb.from("admin_audit_logs").insert({
    admin_id: admin?.id ?? null,
    action,
    action_label: actionLabel,
    target_type: targetType,
    target_id: targetId,
  });
}

/* ---- Settings ---- */

export async function getSettings(): Promise<PlatformSettings> {
  if (isDemoMode()) return { ...demoStore.settings };
  const sb = await createServiceClient();
  const { data, error } = await sb.from("platform_settings").select("*").order("id").limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    return { documentRetentionDays: 30, weeklyVerificationEnabled: true, weeklyIntervalDays: 7, consentVersion: "1.0" };
  }
  return {
    documentRetentionDays: data.document_retention_days ?? 30,
    weeklyVerificationEnabled: data.weekly_verification_enabled ?? true,
    weeklyIntervalDays: data.weekly_interval_days ?? 7,
    consentVersion: data.consent_version ?? "1.0",
  };
}

export async function updateSettings(patch: PlatformSettings, adminName: string): Promise<void> {
  if (isDemoMode()) {
    demoStore.settings = { ...patch };
    demoAudit("settings.update", "Тохиргоо өөрчилсөн", "settings", null);
    return;
  }
  const sb = await createServiceClient();
  const { error } = await sb.from("platform_settings").upsert({
    id: 1,
    document_retention_days: patch.documentRetentionDays,
    weekly_verification_enabled: patch.weeklyVerificationEnabled,
    weekly_interval_days: patch.weeklyIntervalDays,
    consent_version: patch.consentVersion,
  });
  if (error) throw new Error(error.message);
  await adminAudit("settings.update", "Тохиргоо өөрчилсөн", "settings", null, adminName);
}

/** Retention: хугацаа хэтэрсэн document-уудыг устгах (R2 object + metadata) */
export async function runRetention(): Promise<{ deleted: number }> {
  if (isDemoMode()) {
    let deleted = 0;
    const cutoff = new Date().toISOString();
    for (const req of demoStore.requests) {
      for (const doc of req.documents) {
        if (doc.retentionUntil && doc.retentionUntil < cutoff && doc.status === "uploaded") {
          doc.status = "deleted";
          demoStore.documentBlobs.delete(doc.objectKey);
          deleted += 1;
        }
      }
    }
    if (deleted > 0) demoAudit("retention.run", "Хугацаа хэтэрсэн баримт устгасан", "verification_document", null);
    return { deleted };
  }
  // Production: R2 object устгах + metadata update. R2-г lib/r2.ts-оор ажиллуулна.
  const sb = await createServiceClient();
  const cutoff = new Date().toISOString();
  const { data } = await sb
    .from("verification_documents")
    .select("*")
    .lt("retention_until", cutoff)
    .eq("status", "uploaded");
  let deleted = 0;
  for (const doc of data ?? []) {
    try {
      const { deleteR2Object } = await import("@/lib/r2");
      await deleteR2Object(doc.object_key);
      await sb.from("verification_documents").update({ status: "deleted" }).eq("id", doc.id);
      deleted += 1;
    } catch {
      // Алдаа гарвал дараагийн run дээр дахин оролдоно
    }
  }
  if (deleted > 0) {
    await adminAudit("retention.run", "Хугацаа хэтэрсэн баримт устгасан", "verification_document", null, "system");
  }
  return { deleted };
}


/* ==================== MODERATOR APPLICATION (анкет) ==================== */

function mapModeratorApplication(row: Row): ModeratorApplicationData {
  const bankAccounts = Array.isArray(row.bank_accounts) ? row.bank_accounts : [];
  const addressHistory = Array.isArray(row.address_history) ? row.address_history : [];
  return {
    id: str(row.id) ?? "",
    userId: str(row.user_id),
    fullName: str(row.full_name) ?? "",
    facebookLink: str(row.facebook_link) ?? "",
    phoneNumbers: Array.isArray(row.phone_numbers) ? (row.phone_numbers as string[]) : [],
    idCardFrontUrls: Array.isArray(row.id_card_front_urls) ? (row.id_card_front_urls as string[]) : [],
    idCardBackUrls: Array.isArray(row.id_card_back_urls) ? (row.id_card_back_urls as string[]) : [],
    selfieFaceUrl: str(row.selfie_face_url),
    faceMatchStatus: (str(row.face_match_status) as ModeratorApplicationData["faceMatchStatus"]) ?? "pending",
    documentScanStatus: (str(row.id_document_scan_status) as ModeratorApplicationData["documentScanStatus"]) ?? "pending",
    faceMatchScore: typeof row.face_match_score === "number" ? row.face_match_score : null,
    documentScanScore: typeof row.document_scan_score === "number" ? row.document_scan_score : null,
    father: {
      name: str(row.father_name) ?? "",
      phone: str(row.father_phone) ?? "",
      facebookLink: str(row.father_facebook_link) ?? "",
    },
    mother: {
      name: str(row.mother_name) ?? "",
      phone: str(row.mother_phone) ?? "",
      facebookLink: str(row.mother_facebook_link) ?? "",
    },
    bankAccounts: bankAccounts.map((b) => {
      const bank = b as Record<string, unknown>;
      return {
        bankName: str(bank.bankName) ?? str(bank.bank_name) ?? "",
        accountNumber: str(bank.accountNumber) ?? str(bank.account_number) ?? "",
      };
    }),
    currentAddressMapsLink: str(row.current_address_maps_link),
    addressHistory: addressHistory.map((h) => {
      const entry = h as Record<string, unknown>;
      return {
        mapsLink: str(entry.mapsLink) ?? str(entry.maps_link) ?? "",
        capturedAt: str(entry.capturedAt) ?? str(entry.captured_at) ?? "",
      };
    }),
    vpnDetected: Boolean(row.vpn_detected),
    status: (str(row.status) as ModeratorAppStatus) ?? "draft",
    verificationNotes: str(row.verification_notes),
    submittedAt: str(row.submitted_at),
    approvedAt: str(row.approved_at),
    approvedBy: str(row.approved_by),
    createdAt: str(row.created_at) ?? new Date().toISOString(),
    updatedAt: str(row.updated_at) ?? new Date().toISOString(),
  };
}

/** Хэрэглэгчийн шинэ draft анкет үүсгэнэ. Хэрэв draft/editable аль хэдийн байвал үүсгэхгүй. */
export async function createModeratorApplication(userId: string): Promise<ModeratorApplicationData | null> {
  if (isDemoMode()) return demoCreateModeratorApplication(userId);
  const sb = await createServiceClient();
  const { error } = await sb.from("moderator_applications").insert({ user_id: userId });
  if (error) throw new Error(error.message);
  return getModeratorApplicationForUser(userId);
}

/** Хэрэглэгчийн хамгийн сүүлийн анкет (дурын төлөв) — approved-ыг илрүүлэхэд. */
export async function getModeratorApplicationByUser(
  userId: string
): Promise<ModeratorApplicationData | null> {
  if (isDemoMode()) return demoGetModeratorApplicationByUser(userId);
  const sb = await createServiceClient();
  const { data, error } = await sb
    .from("moderator_applications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapModeratorApplication(data) : null;
}

/** Хэрэглэгчийн draft/editable анкетыг буцаана (өөрийнх нь). */
export async function getModeratorApplicationForUser(
  userId: string
): Promise<ModeratorApplicationData | null> {
  if (isDemoMode()) return demoGetModeratorApplicationForUser(userId);
  const sb = await createServiceClient();
  const { data, error } = await sb
    .from("moderator_applications")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["draft", "editable"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapModeratorApplication(data) : null;
}

/** Анкет ID-аар (admin талд хэрэглэгдэнэ — service client, RLS тойруулна). */
export async function getModeratorApplicationById(
  id: string
): Promise<ModeratorApplicationData | null> {
  if (isDemoMode()) return demoGetModeratorApplicationById(id);
  const sb = await createServiceClient();
  const { data, error } = await sb
    .from("moderator_applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapModeratorApplication(data) : null;
}

/** R2 руу upload хийсний дараа objectKey-г тохирох jsonb слотод бүртгэнэ. */
export async function updateApplicationImages(
  userId: string,
  appId: string,
  patch: { frontUrls?: string[]; backUrls?: string[]; selfieUrl?: string | null }
): Promise<ModeratorApplicationData | null> {
  if (isDemoMode()) return demoUpdateApplicationImages(userId, appId, patch);
  const sb = await createServiceClient();
  const app = await getModeratorApplicationById(appId);
  if (!app || app.userId !== userId) return null;
  const update: Record<string, unknown> = {};
  if (patch.frontUrls) update.id_card_front_urls = patch.frontUrls;
  if (patch.backUrls) update.id_card_back_urls = patch.backUrls;
  if (patch.selfieUrl !== undefined) update.selfie_face_url = patch.selfieUrl;
  const { data, error } = await sb
    .from("moderator_applications")
    .update(update)
    .eq("id", appId)
    .eq("user_id", userId)
    .in("status", ["draft", "editable"])
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data ? mapModeratorApplication(data) : null;
}

/** Анкетыг бүрэн илгээнэ. Мэдээллийг бүхэлд нь сервер дээр бичнэ. */
export async function submitModeratorApplication(
  userId: string,
  payload: {
    fullName: string;
    facebookLink: string;
    phoneNumbers: string[];
    idCardFrontUrls: string[];
    idCardBackUrls: string[];
    selfieFaceUrl: string;
    father: ParentInfo;
    mother: ParentInfo;
    bankAccounts: BankAccountInput[];
    mapsLink: string;
    vpnDetected: boolean;
  }
): Promise<ModeratorApplicationData | null> {
  if (isDemoMode()) return demoSubmitModeratorApplication(userId, payload);
  const sb = await createServiceClient();
  const now = new Date().toISOString();
  const historyEntry = { mapsLink: payload.mapsLink, capturedAt: now };
  const allowed: ModeratorAppStatus[] = ["draft", "editable"];
  // Одоо байгаа address_history-г хадгалж, шинийг түүний ард нэмнэ (бүтэн түүвэр)
  const { data: existingRow } = await sb
    .from("moderator_applications")
    .select("address_history")
    .eq("user_id", userId)
    .in("status", allowed)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const prevHistory = Array.isArray(existingRow?.address_history)
    ? (existingRow.address_history as AddressHistoryEntry[])
    : [];
  const mergedHistory = [...prevHistory, historyEntry];
  const { data, error } = await sb
    .from("moderator_applications")
    .update({
      full_name: payload.fullName,
      facebook_link: payload.facebookLink,
      phone_numbers: payload.phoneNumbers,
      id_card_front_urls: payload.idCardFrontUrls,
      id_card_back_urls: payload.idCardBackUrls,
      selfie_face_url: payload.selfieFaceUrl,
      father_name: payload.father.name,
      father_phone: payload.father.phone,
      father_facebook_link: payload.father.facebookLink,
      mother_name: payload.mother.name,
      mother_phone: payload.mother.phone,
      mother_facebook_link: payload.mother.facebookLink,
      bank_accounts: payload.bankAccounts,
      current_address_maps_link: payload.mapsLink,
      address_history: mergedHistory, // өмнөх түүх + шинэ бүртгэл
      vpn_detected: payload.vpnDetected,
      face_match_status: "pending",
      id_document_scan_status: "pending",
      verification_notes: payload.vpnDetected
        ? "VPN илэрсэн — admin хянан шалгах шаардлагатай."
        : null,
      status: "submitted",
      submitted_at: now,
    })
    .eq("user_id", userId)
    .in("status", allowed)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data ? mapModeratorApplication(data) : null;
}

/** Admin: бүх анкетын жагсаалт (шилэн шинээр). */
export async function listModeratorApplicationsAdmin(): Promise<ModeratorApplicationData[]> {
  if (isDemoMode()) return demoListModeratorApplications();
  const sb = await createServiceClient();
  const { data, error } = await sb
    .from("moderator_applications")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapModeratorApplication);
}

/** Admin: анкетын төлөвийг өөрчлөх (editable/approved/rejected). Approved бол түгжигдэнэ. */
export async function setApplicationStatus(
  adminId: string,
  appId: string,
  decision: "approve" | "reject" | "editable",
  notes?: string
): Promise<ModeratorApplicationData | null> {
  if (isDemoMode()) return demoSetModeratorApplicationStatus(adminId, appId, decision, notes);
  const sb = await createServiceClient();
  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    status: decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "editable",
    verification_notes: notes?.trim() || null,
  };
  if (decision === "approve") {
    update.approved_at = now;
    update.approved_by = adminId;
  }
  const { data, error } = await sb
    .from("moderator_applications")
    .update(update)
    .eq("id", appId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data ? mapModeratorApplication(data) : null;
}


/* ==================== Prod row mappers ==================== */

type Row = Record<string, unknown>;

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function mapGroup(row: Row): Group {
  const mg = Array.isArray(row.moderator_groups) ? row.moderator_groups : [];
  const moderators = mg
    .map((r) => {
      const m = (r as Row).moderators as Row | null | undefined;
      if (!m) return null;
      return {
        id: str(m.id) ?? "",
        name: str(m.nickname) || str(m.full_name) || "?",
        memberCount: Number((row as Row).member_count ?? 0),
        isActive: Boolean(m.is_active),
        isPrimary: false,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  return {
    id: str(row.id) ?? "",
    name: str(row.name) ?? "",
    imageUrl: str(row.image_url),
    facebookUrl: str(row.facebook_url),
    memberCount: Number(row.member_count ?? 0),
    description: str(row.description),
    price: typeof row.price === "number" ? row.price : null,
    isActive: Boolean(row.is_active),
    isHidden: Boolean(row.is_hidden),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: str(row.created_at) ?? new Date().toISOString(),
    moderators,
  };
}

function mapModerator(row: Row): Moderator | null {
  if (!row.id) return null;
  const mg = Array.isArray(row.moderator_groups) ? row.moderator_groups : [];
  const groups = mg
    .map((r) => {
      const g = (r as Row).groups as Row | null | undefined;
      if (!g) return null;
      return {
        id: str(g.id) ?? "",
        name: str(g.name) ?? "?",
        memberCount: Number(g.member_count ?? 0),
        isActive: Boolean(g.is_active),
        isPrimary: Boolean((r as Row).is_primary),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  return {
    id: str(row.id) ?? "",
    userId: str(row.user_id),
    fullName: str(row.full_name) ?? "",
    nickname: str(row.nickname) ?? "",
    avatarUrl: str(row.avatar_url),
    facebookUrl: str(row.facebook_url),
    phone: str(row.phone),
    address: str(row.address),
    parentPhone: str(row.parent_phone),
    locationText: str(row.location_text),
    locationStatus: (str(row.location_status) as Moderator["locationStatus"]) ?? "none",
    becameModeratorAt: str(row.became_moderator_at),
    verificationStatus: (str(row.verification_status) as Moderator["verificationStatus"]) ?? "unverified",
    verifiedAt: str(row.verified_at),
    lastWeeklyVerificationAt: str(row.last_weekly_verification_at),
    nextWeeklyVerificationAt: str(row.next_weekly_verification_at),
    isActive: Boolean(row.is_active),
    isPublic: Boolean(row.is_public),
    createdAt: str(row.created_at) ?? new Date().toISOString(),
    groups,
  };
}

function mapPrice(row: Row): ServicePrice {
  return {
    id: str(row.id) ?? "",
    title: str(row.title) ?? "",
    durationMonths: typeof row.duration_months === "number" ? row.duration_months : null,
    price: Number(row.price ?? 0),
    description: str(row.description),
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapAccount(row: Row): PaymentAccount {
  return {
    id: str(row.id) ?? "",
    bankName: str(row.bank_name) ?? "",
    accountHolder: str(row.account_holder) ?? "",
    accountNumber: str(row.account_number) ?? "",
    note: str(row.note),
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: str(row.created_at) ?? new Date().toISOString(),
  };
}

function mapApplication(row: Row): ModeratorApplication {
  return {
    id: str(row.id) ?? "",
    userId: str(row.user_id),
    fullName: str(row.full_name) ?? "",
    nickname: str(row.nickname) ?? "",
    email: str(row.email) ?? "",
    phone: str(row.phone),
    facebookUrl: str(row.facebook_url),
    groupsText: str(row.groups_text),
    additionalInfo: str(row.additional_info),
    status: (str(row.status) as ModeratorApplication["status"]) ?? "pending",
    createdAt: str(row.created_at) ?? new Date().toISOString(),
  };
}

function mapDocument(row: Row): VerificationDocument {
  return {
    id: str(row.id) ?? "",
    requestId: str(row.request_id) ?? "",
    userId: str(row.user_id),
    documentType: (str(row.document_type) as VerificationDocument["documentType"]) ?? "id-card",
    objectKey: str(row.object_key) ?? "",
    fileSize: Number(row.file_size ?? 0),
    contentType: str(row.content_type) ?? "image/jpeg",
    status: (str(row.status) as VerificationDocument["status"]) ?? "uploaded",
    retentionUntil: str(row.retention_until),
    createdAt: str(row.created_at) ?? new Date().toISOString(),
  };
}

function mapRequest(row: Row): VerificationRequest {
  const docs = Array.isArray(row.verification_documents) ? row.verification_documents : [];
  return {
    id: str(row.id) ?? "",
    userId: str(row.user_id),
    moderatorId: str(row.moderator_id),
    fullName: str(row.full_name) || str(row.nickname) || "Хэрэглэгч",
    nickname: str(row.nickname) || "Хэрэглэгч",
    documentType: (str(row.document_type) as VerificationRequest["documentType"]) ?? "id-card",
    status: (str(row.status) as RequestStatus) ?? "draft",
    rejectReason: (str(row.reject_reason) as RejectReason | null) ?? null,
    rejectNote: str(row.reject_note),
    consentId: str(row.consent_id),
    faceResult: (row.face_result as FaceCheckResult | null) ?? null,
    locationStatus: (str(row.location_status) as VerificationRequest["locationStatus"]) ?? "none",
    submittedAt: str(row.submitted_at),
    reviewedAt: str(row.reviewed_at),
    reviewedBy: str(row.reviewed_by),
    createdAt: str(row.created_at) ?? new Date().toISOString(),
    documents: docs.map(mapDocument),
  };
}

function mapIp(row: Row): IpHistoryEntry {
  return {
    id: str(row.id) ?? "",
    userId: str(row.user_id),
    moderatorName: str(row.moderator_name) ?? "Хэрэглэгч",
    ip: str(row.ip_address) ?? "—",
    eventType: (str(row.event_type) as IpHistoryEntry["eventType"]) ?? "weekly",
    status: (str(row.status) as IpHistoryEntry["status"]) ?? "logged",
    nextVerificationAt: str(row.next_verification_at),
    createdAt: str(row.created_at) ?? new Date().toISOString(),
  };
}

function mapLocation(row: Row): LocationRecord {
  const mod = row.moderators as Row | null | undefined;
  return {
    id: str(row.id) ?? "",
    userId: str(row.user_id),
    moderatorName: (str(mod?.nickname) || str(mod?.full_name)) ?? "Хэрэглэгч",
    latitude: typeof row.latitude === "number" ? row.latitude : null,
    longitude: typeof row.longitude === "number" ? row.longitude : null,
    accuracy: typeof row.accuracy === "number" ? row.accuracy : null,
    isCoarse: Boolean(row.is_coarse),
    consentId: str(row.consent_id),
    kind: (str(row.kind) as LocationRecord["kind"]) ?? "weekly",
    createdAt: str(row.created_at) ?? new Date().toISOString(),
    sharedAt: str(row.shared_at) ?? null,
    expiresAt: str(row.expires_at) ?? null,
  };
}

function mapAudit(row: Row): AuditEntry {
  const admin = row.admin_users as Row | null | undefined;
  return {
    id: str(row.id) ?? "",
    adminName: str(admin?.full_name) ?? "system",
    action: str(row.action) ?? "",
    actionLabel: str(row.action_label) ?? str(row.action) ?? "",
    targetType: str(row.target_type),
    targetId: str(row.target_id),
    createdAt: str(row.created_at) ?? new Date().toISOString(),
  };
}

export { FACE_OK, formatDate };
