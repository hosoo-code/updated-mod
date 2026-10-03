"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FileText, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";
import type { ModeratorApplication } from "@/types";

export function ApplicationsAdmin({ applications }: { applications: ModeratorApplication[] }) {
  const router = useRouter();
  const toast = useToast();
  const [deciding, setDeciding] = useState<{ app: ModeratorApplication; decision: "approve" | "reject" } | null>(null);
  const [busy, setBusy] = useState(false);

  const decide = async () => {
    if (!deciding) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/applications/${deciding.app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: deciding.decision }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Алдаа гарлаа.");
      toast.success(deciding.decision === "approve" ? "Өргөдөл зөвшөөрөгдлөө." : "Өргөдөл татгалзлаа.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Алдаа гарлаа.");
    } finally {
      setBusy(false);
      setDeciding(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Өргөдлүүд</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Moderator болох хүсэлтүүд — зөвшөөрсний дараа moderator профайл үүснэ.
        </p>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {applications.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<FileText className="h-5 w-5" />} title="Өргөдөл алга" />
            </div>
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  <th>Өргөдөл гаргагч</th>
                  <th>Холбоо барих</th>
                  <th>Group-ууд</th>
                  <th>Илгээсэн</th>
                  <th>Status</th>
                  <th className="text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={app.fullName} size="sm" />
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-white">{app.fullName}</p>
                          <p className="text-xs text-zinc-400">{app.nickname}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300">{app.email}</p>
                      {app.phone ? <p className="text-xs text-zinc-400">{app.phone}</p> : null}
                      {app.facebookUrl ? (
                        <a href={app.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#1877F2] hover:underline dark:text-[#6da3ff]">
                          Facebook
                        </a>
                      ) : null}
                    </td>
                    <td className="max-w-[220px]">
                      <p className="truncate text-xs text-zinc-600 dark:text-zinc-300">{app.groupsText ?? "—"}</p>
                    </td>
                    <td className="text-zinc-400">{formatDateTime(app.createdAt)}</td>
                    <td><StatusBadge status={app.status} /></td>
                    <td className="text-right">
                      {app.status === "pending" ? (
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="primary" onClick={() => setDeciding({ app, decision: "approve" })}>
                            <Check className="h-3.5 w-3.5" /> Зөвшөөрөх
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => setDeciding({ app, decision: "reject" })}>
                            <X className="h-3.5 w-3.5" /> Татгалзах
                          </Button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deciding !== null}
        onClose={() => setDeciding(null)}
        onConfirm={decide}
        loading={busy}
        title={deciding?.decision === "approve" ? "Өргөдөл зөвшөөрөх үү?" : "Өргөдөл татгалзах уу?"}
        description={
          deciding?.decision === "approve"
            ? `${deciding?.app.fullName ?? ""} (${deciding?.app.nickname ?? ""}) нэртэй moderator профайл үүснэ.`
            : `${deciding?.app.fullName ?? ""} (${deciding?.app.nickname ?? ""})-ийн өргөдөл татгалзана.`
        }
        confirmLabel={deciding?.decision === "approve" ? "Зөвшөөрөх" : "Татгалзах"}
        danger={deciding?.decision === "reject"}
      />
    </div>
  );
}
