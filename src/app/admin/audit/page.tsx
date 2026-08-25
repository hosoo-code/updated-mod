import { History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { listAuditAdmin } from "@/lib/repo";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Audit log — admin үйлдэл бүр бүртгэгдэнэ.
 * Шаардлагагүй sensitive мэдээлэл audit-д хадгалагдахгүй (зөвхөн action + target id).
 */
export default async function AdminAuditPage() {
  const entries = await listAuditAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Audit Logs</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Admin-уудын бүх үйлдлийн тэмдэглэл — сүүлийн 200 бүртгэл.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<History className="h-5 w-5" />} title="Audit бүртгэл алга" />
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-white/5">
              {entries.map((e) => (
                <div key={e.id} className="flex items-center gap-4 px-5 py-3.5">
                  <Avatar name={e.adminName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">{e.actionLabel}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      <span className="font-mono">{e.action}</span>
                      {e.targetType ? <span> · {e.targetType}</span> : null}
                      {e.targetId ? <span className="font-mono"> #{e.targetId.slice(0, 8)}</span> : null}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-300">{e.adminName}</p>
                    <p className="text-[11px] text-zinc-400">{formatDateTime(e.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
