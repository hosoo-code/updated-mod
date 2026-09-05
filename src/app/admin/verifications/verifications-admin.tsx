"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, ListChecks, MapPin, ScanFace } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatDateTime } from "@/lib/utils";
import type { VerificationRequest } from "@/types";

export function VerificationsAdmin({ verifications }: { verifications: VerificationRequest[] }) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Verifications</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Identity баталгаажуулалтын хүсэлтүүд — шалгаад шийдвэр гаргана.
        </p>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {verifications.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<ListChecks className="h-5 w-5" />} title="Хүсэлт алга" />
            </div>
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  <th>Moderator</th>
                  <th>Status</th>
                  <th>Баримт</th>
                  <th>Нүүр</th>
                  <th>Байршил</th>
                  <th>Илгээсэн</th>
                  <th className="text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {verifications.map((v) => {
                  const hasDoc = v.documents.some((d) => d.documentType === v.documentType);
                  const hasFace = v.documents.some((d) => d.documentType === "face");
                  return (
                    <tr key={v.id} className="cursor-pointer" onClick={() => router.push(`/admin/verifications/${v.id}`)}>
                      <td>
                        <p className="font-semibold text-zinc-900 dark:text-white">{v.nickname}</p>
                        <p className="text-xs text-zinc-400">{v.fullName}</p>
                      </td>
                      <td><StatusBadge status={v.status} /></td>
                      <td>
                        <span className={"inline-flex items-center gap-1 text-xs " + (hasDoc ? "text-brand-600 dark:text-brand-300" : "text-zinc-400")}>
                          {hasDoc ? "✓" : "✗"} {v.documentType === "id-card" ? "Үнэмлэх" : "Гэрчилгээ"}
                        </span>
                      </td>
                      <td>
                        <span className={"inline-flex items-center gap-1 text-xs " + (hasFace ? "text-brand-600 dark:text-brand-300" : "text-zinc-400")}>
                          <ScanFace className="h-3.5 w-3.5" /> {hasFace ? (v.faceResult?.livenessPassed ? "Liveness ✓" : "Оруулсан") : "—"}
                        </span>
                      </td>
                      <td>
                        <span className={"inline-flex items-center gap-1 text-xs " + (v.locationStatus === "verified" ? "text-brand-600 dark:text-brand-300" : "text-zinc-400")}>
                          <MapPin className="h-3.5 w-3.5" />
                          {v.locationStatus === "verified" ? "Баталгаажсан" : v.locationStatus === "denied" ? "Татгалзсан" : v.locationStatus === "unavailable" ? "Боломжгүй" : "—"}
                        </span>
                      </td>
                      <td className="text-zinc-400">{formatDateTime(v.submittedAt ?? v.createdAt)}</td>
                      <td className="text-right">
                        <Link
                          href={`/admin/verifications/${v.id}`}
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
                        >
                          <Eye className="h-3.5 w-3.5" /> Review
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
