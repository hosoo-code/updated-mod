"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, EyeOff, FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatMemberCount } from "@/lib/utils";
import type { Group } from "@/types";

export function GroupsAdmin({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<Group | "new" | null>(null);
  const [deleting, setDeleting] = useState<Group | null>(null);
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

  const save = async (form: GroupForm) => {
    const okRes =
      editing === "new"
        ? await mutate("/api/admin/groups", "POST", form)
        : await mutate(`/api/admin/groups/${(editing as Group).id}`, "PATCH", form);
    if (okRes) {
      setEditing(null);
      toast.success("Group хадгалагдлаа.");
      router.refresh();
    }
  };

  const remove = async () => {
    if (!deleting) return;
    const okRes = await mutate(`/api/admin/groups/${deleting.id}`, "DELETE");
    if (okRes) {
      setDeleting(null);
      toast.success("Group устгагдлаа.");
      router.refresh();
    }
  };

  const toggleHidden = async (g: Group) => {
    const okRes = await mutate(`/api/admin/groups/${g.id}`, "PATCH", { isHidden: !g.isHidden });
    if (okRes) router.refresh();
  };

  const reorder = async (g: Group, dir: "up" | "down") => {
    const okRes = await mutate(`/api/admin/groups/${g.id}`, "PATCH", { reorder: dir });
    if (okRes) router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Groups</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Facebook group-уудыг гараар удирдана. Member count-ыг гараар оруулна.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" /> Group нэмэх
        </Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {groups.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<FolderKanban className="h-5 w-5" />} title="Group алга" description="Шинэ group нэмэх товчийг дарна уу." />
            </div>
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Members</th>
                  <th>Link</th>
                  <th>Moderators</th>
                  <th>Status</th>
                  <th className="text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <p className="font-semibold text-zinc-900 dark:text-white">{g.name}</p>
                      {g.description ? <p className="mt-0.5 max-w-[260px] truncate text-xs text-zinc-400">{g.description}</p> : null}
                    </td>
                    <td className="font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">{formatMemberCount(g.memberCount)}</td>
                    <td>
                      {g.facebookUrl ? (
                        <a href={g.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-[#1877F2] hover:underline dark:text-[#6da3ff]">
                          Facebook →
                        </a>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {g.moderators.slice(0, 3).map((m) => (
                          <span key={m.id} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-white/8 dark:text-zinc-400">
                            {m.isPrimary ? "★ " : ""}{m.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {g.isActive ? <Badge tone="brand" dot>Идэвхтэй</Badge> : <Badge tone="muted" dot>Идэвхгүй</Badge>}
                      {g.isHidden ? <Badge tone="warning" className="ml-1">Нуугдсан</Badge> : null}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn title="Дээш" onClick={() => reorder(g, "up")}><ArrowUp className="h-3.5 w-3.5" /></IconBtn>
                        <IconBtn title="Доош" onClick={() => reorder(g, "down")}><ArrowDown className="h-3.5 w-3.5" /></IconBtn>
                        <IconBtn title={g.isHidden ? "Харуулах" : "Нуух"} onClick={() => toggleHidden(g)}>
                          {g.isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </IconBtn>
                        <IconBtn title="Засах" onClick={() => setEditing(g)}><Pencil className="h-3.5 w-3.5" /></IconBtn>
                        <IconBtn title="Устгах" danger onClick={() => setDeleting(g)}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
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
        <GroupDialog group={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSave={save} busy={busy} />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={busy}
        danger
        title="Group устгах уу?"
        description={`"${deleting?.name}" групп болон түүний moderator хамаарлууд устана. Энэ үйлдлийг буцаах боломжгүй.`}
        confirmLabel="Устгах"
      />
    </div>
  );
}

type GroupForm = {
  name: string;
  facebookUrl: string;
  memberCount: number;
  description: string;
  price?: number;
  isActive: boolean;
};

function GroupDialog({
  group,
  onClose,
  onSave,
  busy,
}: {
  group: Group | null;
  onClose: () => void;
  onSave: (form: GroupForm) => Promise<void>;
  busy: boolean;
}) {
  const [form, setForm] = useState<GroupForm>({
    name: group?.name ?? "",
    facebookUrl: group?.facebookUrl ?? "",
    memberCount: group?.memberCount ?? 0,
    description: group?.description ?? "",
    price: group?.price ?? undefined,
    isActive: group?.isActive ?? true,
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title={group ? "Group засах" : "Group нэмэх"}
      description="Member count-ыг гараар оруулна (Facebook scraping хийхгүй)."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Болих</Button>
          <Button loading={busy} onClick={() => onSave(form)}>Хадгалах</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Group нэр *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Жишээ: Arhat Official" />
        <Input label="Facebook линк" value={form.facebookUrl} onChange={(e) => setForm((f) => ({ ...f, facebookUrl: e.target.value }))} placeholder="https://facebook.com/groups/…" />
        <Input
          type="number"
          label="Member count *"
          value={form.memberCount}
          onChange={(e) => setForm((f) => ({ ...f, memberCount: Number(e.target.value) }))}
          hint="Жишээ: 511000"
        />
        <Textarea label="Тайлбар" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        <Input
          type="number"
          label="Үйлчилгээний үнэ (₮, заавал биш)"
          value={form.price ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value ? Number(e.target.value) : undefined }))}
        />
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
