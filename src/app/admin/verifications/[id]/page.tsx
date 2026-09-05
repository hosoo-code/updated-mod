import { notFound } from "next/navigation";
import { getVerificationById, listIpsAdmin, listLocationsAdmin } from "@/lib/repo";
import { ReviewClient } from "./review-client";
import { adminAudit } from "@/lib/repo";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Admin review page — sensitive баримтуудыг ЗӨВХӨН short-lived signed URL-ээр үзүүлнэ.
 * Permanent public URL байхгүй. Үзэлт бүр audit-д бичигдэнэ.
 */
export default async function AdminReviewPage({ params }: PageProps) {
  const { id } = await params;
  const admin = await getSessionUser();
  const request = await getVerificationById(id);
  if (!request) notFound();

  // Admin үзэлтийг audit-д бүртгэх
  if (admin?.fullName) {
    try {
      await adminAudit("verification.view", "Баталгаажуулалт үзсэн", "verification_request", id, admin.fullName);
    } catch {
      /* audit алдаа нь review-г хаахгүй */
    }
  }

  const [ips, locations] = await Promise.all([
    listIpsAdmin(),
    listLocationsAdmin(),
  ]);

  const relatedIps = ips.filter(
    (i) => i.userId === request.userId || i.moderatorName === request.nickname
  );
  const relatedLocations = locations.filter(
    (l) => l.userId === request.userId || l.moderatorName === request.nickname
  );

  return <ReviewClient request={request} ips={relatedIps} locations={relatedLocations} />;
}
