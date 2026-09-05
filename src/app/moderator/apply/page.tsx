import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ApplyWizard } from "./apply-wizard";
import { getSessionUser } from "@/lib/auth";
import {
  createModeratorApplication,
  getModeratorApplicationByUser,
  getModeratorApplicationForUser,
} from "@/lib/repo";
import type { ApplyWizardData, ModeratorApplicationData } from "@/types";

export const metadata: Metadata = { title: "Moderator болох өргөдөл" };
export const dynamic = "force-dynamic";

/** Angket → wizard-д дамжуулах ApplyWizardData */
function toWizardData(a: ModeratorApplicationData): ApplyWizardData {
  return {
    fullName: a.fullName,
    facebookLink: a.facebookLink,
    phoneNumbers: a.phoneNumbers,
    idCardFrontUrls: a.idCardFrontUrls,
    idCardBackUrls: a.idCardBackUrls,
    selfieFaceUrl: a.selfieFaceUrl,
    father: a.father,
    mother: a.mother,
    bankAccounts: a.bankAccounts,
    currentAddressMapsLink: a.currentAddressMapsLink,
    vpnDetected: a.vpnDetected,
  };
}

export default async function ApplyPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/moderator/apply");

  // Өгөгдлийн сангийн алдаа (таблиц алга, сүлжээ гэх мэт) — хуудсыг
  // blank болгохгүйгээр найрсаг мэдээлэл харуулна.
  let anyApp: ModeratorApplicationData | null;
  let app: ModeratorApplicationData | null;
  try {
    // Хэрэглэгч аль хэдийн approved байгаа эсэхийг шалгана — дахин draft үүсгэхгүй
    anyApp = await getModeratorApplicationByUser(user.id);
    app = await getModeratorApplicationForUser(user.id);
    if (!app) {
      app = await createModeratorApplication(user.id);
    }
  } catch (e) {
    console.error("[apply] Анкет ачааллахад алдаа гарлаа:", e);
    return (
      <Shell>
        <Heading />
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-700 dark:text-amber-300">
          Анкетын мэдээллийг ачааллахад алдаа гарлаа. Хэсэг хугацааны дараа дахин оролдоно уу.
        </div>
      </Shell>
    );
  }

  if (anyApp?.status === "approved") {
    return (
      <Shell>
        <ApplyWizard
          applicationId={anyApp.id}
          initial={toWizardData(anyApp)}
          lockedReason={anyApp.verificationNotes ?? undefined}
        />
      </Shell>
    );
  }

  // draft/editable байвал ачаална, эс bол шинэ draft үүсгэнэ
  if (!app) {
    return (
      <Shell>
        <Heading />
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          Анкет үүсгэхэд алдаа гарлаа. Дахин оролдоно уу.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <Heading />
      <ApplyWizard
        applicationId={app.id}
        initial={toWizardData(app)}
        editable={app.status === "editable"}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">{children}</main>
      <SiteFooter />
    </div>
  );
}

function Heading() {
  return (
    <div className="mb-8 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300">
        ARHAT MODERATOR
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
        Moderator болох өргөдөл
      </h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        Бүх алхмыг бөглөсний дараа анкетаа илгээнэ үү. Admin баг хянаж, үр дүнг танд мэдэгдэнэ.
      </p>
    </div>
  );
}
