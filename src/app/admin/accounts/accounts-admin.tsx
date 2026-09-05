"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Banknote, Pencil, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import type { PaymentAccount } from "@/types";

/**
 * Төлбөрийн дансны удирдлага — тооны хязгааргүй олон данс нэмэх боломжтой.
 * Зөвхөн идэвхтэй дансууд public дээр харагдана.
 */
export function AccountsAdmin({ accounts }: { accounts: PaymentAccount[] }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<PaymentAccount | "new" | null>(null);
  const [deleting, setDeleting] = useState<PaymentAccount | null>(null);
  const [busy, setBusy] = useState(false);

  const mutate = async (url: string, method: string, body?: unknown): Promise<boolean> => {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Алдаа гарлаа.");
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Алдаа гарлаа.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const save = async (form: AccountForm) => {
    const okRes =
      editing === "new"
        ? await mutate("/api/admin/accounts", "POST", form)
        : await mutate(`/api/admin/accounts/${(editing as PaymentAccount).id}`, "PATCH", form);
    if (okRes) {
      setEditing(null);
      toast.success("Данс хадгалагдлаа.");
      router.refresh();
    }
  };

  const remove = async () => {
    if (!deleting) return;
    const okRes = await mutate(`/api/admin/accounts/${deleting.id}`, "DELETE");
    if (okRes) {
      setDeleting(null);
      toast.success("Данс устгагдлаа.");
      router.refresh();
    }
  };

  const toggle = async (a: PaymentAccount) => {
    const okRes = await mutate(`/api/admin/accounts/${a.id}`, "PATCH", { isActive: !a.isActive });
    if (okRes) router.refresh();
  };

  const reorder = async (a: PaymentAccount, dir: "up" | "down") => {
    const okRes = await mutate(`/api/admin/accounts/${a.id}`, "PATCH", { reorder: dir });
    if (okRes) router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Төлбөрийн дансууд</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Олон данс нэмэх боломжтой — идэвхгүй данс public дээр харагдахгүй.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" /> Данс нэмэх
        </Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {accounts.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<Banknote className="h-5 w-5" />} title="Данс алга" description="Банкны данс нэмэх товчийг дарна уу." />
            </div>
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  <th>Банк</th>
                  <th>Данс эзэмшигч</th>
                  <th>Дансны дугаар</th>
                  <th>Тайлбар</th>
                  <th>Status</th>
                  <th>Дараалал</th>
                  <th className="text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id}>
                    <td className="font-semibold text-zinc-900 dark:text-white">{a.bankName}</td>
                    <td className="text-zinc-600 dark:text-zinc-300">{a.accountHolder}</td>
                    <td className="font-mono font-semibold tabular-nums tracking-wider text-zinc-800 dark:text-zinc-100">{a.accountNumber}</td>
                    <td className="max-w-[180px] truncate text-zinc-400">{a.note ?? "—"}</td>
                    <td>
                      <button onClick={() => toggle(a)} title="Идэвхтэй/идэвхгүй болгох">
                        {a.isActive ? <Badge tone="brand" dot>Идэвхтэй</Badge> : <Badge tone="muted" dot>Идэвхгүй</Badge>}
                      </button>
                    </td>
                    <td className="text-zinc-400">#{a.sortOrder}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn title="Дээш" onClick={() => reorder(a, "up")}><ArrowUp className="h-3.5 w-3.5" /></IconBtn>
                        <IconBtn title="Доош" onClick={() => reorder(a, "down")}><ArrowDown className="h-3.5 w-3.5" /></IconBtn>
                        <IconBtn title="Засах" onClick={() => setEditing(a)}><Pencil className="h-3.5 w-3.5" /></IconBtn>
                        <IconBtn title="Устгах" danger onClick={() => setDeleting(a)}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {editing ? (
        <AccountDialog account={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSave={save} busy={busy} />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={busy}
        danger
        title="Данс устгах уу?"
        description={`${deleting?.bankName} — ${deleting?.accountNumber} данс устана.`}
        confirmLabel="Устгах"
      />
    </div>
  );
}

type AccountForm = {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  note: string;
  isActive: boolean;
};

function AccountDialog({
  account,
  onClose,
  onSave,
  busy,
}: {
  account: PaymentAccount | null;
  onClose: () => void;
  onSave: (form: AccountForm) => Promise<void>;
  busy: boolean;
}) {
  const [form, setForm] = useState<AccountForm>({
    bankName: account?.bankName ?? "",
    accountHolder: account?.accountHolder ?? "",
    accountNumber: account?.accountNumber ?? "",
    note: account?.note ?? "",
    isActive: account?.isActive ?? true,
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title={account ? "Данс засах" : "Банкны данс нэмэх"}
      description="Банкны төрөл, эзэмшигч, дугаарыг оруулна."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Болих</Button>
          <Button loading={busy} onClick={() => onSave(form)}>Данс хадгалах</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Банкны төрөл *" value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} placeholder="Жишээ: Khan Bank" />
        <Input label="Данс эзэмшигчийн нэр *" value={form.accountHolder} onChange={(e) => setForm((f) => ({ ...f, accountHolder: e.target.value }))} placeholder="Жишээ: Arhat Edit" />
        <Input
          label="Дансны дугаар *"
          value={form.accountNumber}
          onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value.replace(/[^0-9]/g, "") }))}
          placeholder="Зөвхөн цифр"
          maxLength={20}
        />
        <Input label="Тайлбар" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Жишээ: Үндсэн данс" />
        <div className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 dark:border-white/10">
          <span className="text-sm text-zinc-700 dark:text-zinc-200">Идэвхтэй эсэх</span>
          <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} label="Идэвхтэй" />
        </div>
      </div>
    </Dialog>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      className={
        "rounded-lg p-2 transition " +
        (danger
          ? "text-zinc-400 hover:bg-rose-500/10 hover:text-rose-500"
          : "text-zinc-400 hover:bg-black/5 hover:text-zinc-800 dark:hover:bg-white/10 dark:hover:text-white")
      }
    >
      {children}
    </button>
  );
}
