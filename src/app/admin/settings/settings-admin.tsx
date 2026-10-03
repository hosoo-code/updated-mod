"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import type { PlatformSettings } from "@/types";

export function SettingsAdmin({ settings }: { settings: PlatformSettings }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(settings);
  const [busy, setBusy] = useState(false);
  const [retentionBusy, setRetentionBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Хадгалахад алдаа гарлаа.");
      toast.success("Тохиргоо хадгалагдлаа.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  };

  const runRetention = async () => {
    setRetentionBusy(true);
    try {
      const res = await fetch("/api/admin/retention", { method: "POST" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Алдаа гарлаа.");
      toast.success(`${json.data.deleted} баримт устгагдлаа.`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Алдаа гарлаа.");
    } finally {
      setRetentionBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Платформын тохиргоо — өөрчлөлт audit-д бичигдэнэ.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-brand-500" /> Баталгаажуулалтын тохиргоо
          </CardTitle>
          <CardDescription>Identity баримтын retention болон 7 хоногийн шалгалт</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Input
            type="number"
            label="Document retention (хоног)"
            value={form.documentRetentionDays}
            onChange={(e) => setForm((f) => ({ ...f, documentRetentionDays: Number(e.target.value) }))}
            hint="Энэ хугацааны дараа identity баримтууд R2-оос автоматаар устгагдана."
          />
          <div className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 dark:border-white/10">
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">7 хоногийн баталгаажуулалт</p>
              <p className="text-xs text-zinc-400">Moderator-ууд 7 хоног тутамд баталгаажуулалт хийх шаардлагатай</p>
            </div>
            <Switch checked={form.weeklyVerificationEnabled} onCheckedChange={(v) => setForm((f) => ({ ...f, weeklyVerificationEnabled: v }))} label="7 хоногийн баталгаажуулалт" />
          </div>
          <Input
            type="number"
            label="Баталгаажуулалтын интервал (хоног)"
            value={form.weeklyIntervalDays}
            onChange={(e) => setForm((f) => ({ ...f, weeklyIntervalDays: Number(e.target.value) }))}
            disabled={!form.weeklyVerificationEnabled}
          />
          <Input
            label="Consent version"
            value={form.consentVersion}
            onChange={(e) => setForm((f) => ({ ...f, consentVersion: e.target.value }))}
            hint="Privacy notice өөрчлөгдөхөд version-оо нэмэгдүүлнэ."
          />
          <Button onClick={save} loading={busy}>Хадгалах</Button>
        </CardContent>
      </Card>

      <Card className="border-rose-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <Trash2 className="h-4 w-4" /> Retention ажиллуулах
          </CardTitle>
          <CardDescription>
            Хугацаа хэтэрсэн identity баримтуудыг одоо устгана. (Автоматаар /api/cron/retention-оор ч ажилладаг.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="danger" onClick={runRetention} loading={retentionBusy}>
            <Trash2 className="h-4 w-4" /> Одоо устгах
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
