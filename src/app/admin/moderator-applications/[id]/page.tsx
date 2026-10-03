import { notFound } from "next/navigation";
import { getModeratorApplicationById, adminAudit } from "@/lib/repo";
import { getSessionUser } from "@/lib/auth";
import { ApplicationReview } from "./review-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Анкет хяналт" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ModeratorApplicationReviewPage({ params }: PageProps) {
  const { id } = await params;
  const admin = await getSessionUser();
  const app = await getModeratorApplicationById(id);
  if (!app) notFound();

  // Admin үзэлт audit-д тэмдэглэх
  if (admin?.fullName) {
    try {
      await adminAudit("moderator_application.view", "Модератор анкет үзсэн", "moderator_applications", id, admin.fullName);
    } catch {
      /* audit алдаа review-г хаахгүй */
    }
  }

  return <ApplicationReview app={app} adminName={admin?.fullName ?? "Админ"} />;
}
