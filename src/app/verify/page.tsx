import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { VerificationWizard } from "@/components/verification/verification-wizard";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Баталгаажуулалт" };
export const dynamic = "force-dynamic";

/**
 * Identity verification wizard.
 * Нэвтрээгүй бол login руу чиглүүлнэ — камер зөвхөн зөвшөөрөлтэй user-т нээгдэнэ.
 */
export default async function VerifyPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/verify");

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <VerificationWizard />
      </main>
      <SiteFooter />
    </div>
  );
}
