import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Moderator болох" };
export const dynamic = "force-dynamic";

/**
 * Compatibility route. Moderator application is the single canonical
 * onboarding and identity-verification flow.
 */
export default function VerifyPage() {
  redirect("/moderator/apply");
}
