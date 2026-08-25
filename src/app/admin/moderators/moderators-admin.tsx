"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Search, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatMemberCount } from "@/lib/utils";
import type { Group, Moderator } from "@/types";

export function ModeratorsAdmin({ moderators, groups }: { moderators: Moderator[]; groups?: Group[] }) {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Moderator | null>(null);

  const filtered = moderators.filter(
    (m) =>
      m.fullName.toLowerCase().includes(query.toLowerCase()) ||
      m.nickname.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Moderators</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Нийт {moderators.length} moderator.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 dark:border-white/10 dark:bg-white/[0.04] sm:w-72">
          <Search className="h-4 w-4 shrink-0 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Нэрээр хайх…"
            className="w-full bg-transparent text-sm focus:outline-none dark:text-white"
          />
        </div>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<Users className="h-5 w-5" />} title="Moderator олдсонгүй" />
            </div>
          ) : (
            <table className="table-base">
              <thead>
                <tr>
                  <th>Profile</th>
                  <th>Facebook</th>
                  <th>Groups</th>
                  <th>Баталгаажуулалт</th>
                  <th>Сүүлийн шалгалт</th>
                  <th className="text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar name={m.fullName} src={m.avatarUrl} size="sm" />
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-white">{m.nickname}</p>
                          <p className="text-xs text-zinc-400">{m.fullName}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      {m.facebookUrl ? (
                        <a href={m.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-[#1877F2] hover:underline dark:text-[#6da3ff]">
                          Профайл
                        </a>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {m.groups.slice(0, 2).map((g) => (
                          <span key={g.id} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-white/8 dark:text-zinc-400">
                            {g.name.length > 14 ? g.name.slice(0, 14) + "…" : g.name} · {formatMemberCount(g.memberCount)}
                          </span>
                        ))}
                        {m.groups.length > 2 ? <span className="text-[10px] text-zinc-400">+{m.groups.length - 2}</span> : null}
                      </div>
                    </td>
                    <td><StatusBadge status={m.verificationStatus} /></td>
                    <td className="text-zinc-400">{m.lastWeeklyVerificationAt ? formatDate(m.lastWeeklyVerificationAt) : "—"}</td>
                    <td className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(m)}>
                        <Pencil className="h-3.5 w-3.5" /> Засах
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {editing ? (
        <EditModeratorDialog
          moderator={editing}
          groups={groups ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            toast.success("Moderator мэдээлэл хадгалагдлаа.");
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function EditModeratorDialog({
  moderator,
  groups,
  onClose,
  onSaved,
}: {
  moderator: Moderator;
  groups: Group[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    fullName: moderator.fullName,
    nickname: moderator.nickname,
    facebookUrl: moderator.facebookUrl ?? "",
    phone: moderator.phone ?? "",
    locationText: moderator.locationText ?? "",
    isPublic: moderator.isPublic,
    isActive: moderator.isActive,
    groupIds: moderator.groups.map((g) => g.id),
  });

  const toggleGroup = (id: string) => {
    setForm((f) => ({
      ...f,
      groupIds: f.groupIds.includes(id) ? f.groupIds.filter((x) => x !== id) : [...f.groupIds, id],
    }));
  };

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/moderators/${moderator.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Хадгалахад алдаа гарлаа.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={`${moderator.nickname} — засах`} description="Moderator-ийн мэдээлэл, group хамаарал" size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Болих</Button>
          <Button onClick={save} loading={busy}>Хадгалах</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Бүтэн нэр" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
          <Input label="Moderator нэр" value={form.nickname} onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))} />
        </div>
        <Input label="Facebook линк" value={form.facebookUrl} onChange={(e) => setForm((f) => ({ ...f, facebookUrl: e.target.value }))} />
        <Input label="Утас" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        <Input label="Байршил (текст)" value={form.locationText} onChange={(e) => setForm((f) => ({ ...f, locationText: e.target.value }))} />
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Хариуцах group-ууд</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {groups.map((g) => (
              <label key={g.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 dark:border-white/10 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={form.groupIds.includes(g.id)}
                  onChange={() => toggleGroup(g.id)}
                  className="h-4 w-4 accent-brand-500"
                />
                <span className="truncate">{g.name}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 dark:border-white/10">
          <span className="text-sm text-zinc-700 dark:text-zinc-200">Нийтэд харагдах</span>
          <Switch checked={form.isPublic} onCheckedChange={(v) => setForm((f) => ({ ...f, isPublic: v }))} label="Нийтэд харагдах" />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 dark:border-white/10">
          <span className="text-sm text-zinc-700 dark:text-zinc-200">Идэвхтэй</span>
          <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} label="Идэвхтэй" />
        </div>
      </div>
    </Dialog>
  );
}
