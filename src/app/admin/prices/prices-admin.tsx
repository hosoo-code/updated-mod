"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatTugrik } from "@/lib/utils";
import type { ServicePrice } from "@/types";

export function PricesAdmin({ prices }: { prices: ServicePrice[] }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<ServicePrice | "new" | null>(null);
  const [deleting, setDeleting] = useState<ServicePrice | null>(null);
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

  const save = async (form: PriceForm) => {
    const okRes =
      editing === "new"
        ? await mutate("/api/admin/prices", "POST", form)
        : await mutate(`/api/admin/prices/${(editing as ServicePrice).id}`, "PATCH", form);
    if (okRes) {
      setEditing(null);
      toast.success("Үнэ хадгалагдлаа.");
      router.refresh();
    }
  };

  const remove = async () => {
    if (!deleting) return;
    const okRes = await mutate(`/api/admin/prices/${deleting.id}`, "DELETE");
    if (okRes) {
      setDeleting(null);
      toast.success("Үнэ устгагдлаа.");
      router.refresh();
    }
  };

  const reorder = async (p: ServicePrice, dir: "up" | "down") => {
    const okRes = await mutate(`/api/admin/prices/${p.id}`, "PATCH", { reorder: dir });
    if (okRes) router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Үнийн санал</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Database-driven үнүүд — hardcode хийгдээгүй, эндээс удирдана.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" /> Үнэ нэмэх
        </Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {prices.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<Tag className="h-5 w-5" />} title="Үнэ алга" />
            </div>
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  <th>Гарчиг</th>
                  <th>Хугацаа</th>
                  <th>Үнэ</th>
                  <th>Тайлбар</th>
                  <th>Status</th>
                  <th className="text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {prices.map((p) => (
                  <tr key={p.id}>
                    <td className="font-semibold text-zinc-900 dark:text-white">{p.title}</td>
                    <td className="text-zinc-400">{p.durationMonths ? `${p.durationMonths} сар` : "—"}</td>
                    <td className="font-bold tabular-nums text-zinc-900 dark:text-white">{formatTugrik(p.price)}</td>
                    <td className="max-w-[220px] truncate text-zinc-400">{p.description ?? "—"}</td>
                    <td>{p.isActive ? <Badge tone="brand" dot>Идэвхтэй</Badge> : <Badge tone="muted" dot>Идэвхгүй</Badge>}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn title="Дээш" onClick={() => reorder(p, "up")}><ArrowUp className="h-3.5 w-3.5" /></IconBtn>
                        <IconBtn title="Доош" onClick={() => reorder(p, "down")}><ArrowDown className="h-3.5 w-3.5" /></IconBtn>
                        <IconBtn title="Засах" onClick={() => setEditing(p)}><Pencil className="h-3.5 w-3.5" /></IconBtn>
                        <IconBtn title="Устгах" danger onClick={() => setDeleting(p)}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
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
        <PriceDialog price={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSave={save} busy={busy} />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={busy}
        danger
        title="Үнэ устгах уу?"
        description={`"${deleting?.title}" — ${deleting ? formatTugrik(deleting.price) : ""} үнэтэй багц устана.`}
        confirmLabel="Устгах"
      />
    </div>
  );
}

type PriceForm = {
  title: string;
  durationMonths: number;
  price: number;
  description: string;
  isActive: boolean;
};

function PriceDialog({
  price,
  onClose,
  onSave,
  busy,
}: {
  price: ServicePrice | null;
  onClose: () => void;
  onSave: (form: PriceForm) => Promise<void>;
  busy: boolean;
}) {
  const [form, setForm] = useState<PriceForm>({
    title: price?.title ?? "",
    durationMonths: price?.durationMonths ?? 1,
    price: price?.price ?? 0,
    description: price?.description ?? "",
    isActive: price?.isActive ?? true,
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title={price ? "Үнэ засах" : "Үнэ нэмэх"}
      description="Багцын нэр, хугацаа, үнийг оруулна."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Болих</Button>
          <Button loading={busy} onClick={() => onSave(form)}>Хадгалах</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Гарчиг *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Жишээ: 1 сар" />
        <div className="grid grid-cols-2 gap-3">
          <Input type="number" label="Хугацаа (сар) *" value={form.durationMonths} onChange={(e) => setForm((f) => ({ ...f, durationMonths: Number(e.target.value) }))} />
          <Input type="number" label="Үнэ (₮) *" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} />
        </div>
        <Textarea label="Тайлбар" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        <div className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 dark:border-white/10">
          <span className="text-sm text-zinc-700 dark:text-zinc-200">Идэвхтэй</span>
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
