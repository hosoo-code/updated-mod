"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

/**
 * Step-by-step өргөдлийн форм.
 * Шаардлагагүй мэдээлэл АСУУХГҮЙ — зөвхөн шаардлагатай талбарууд.
 */
export function ApplyForm() {
  const router = useRouter();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    nickname: "",
    email: "",
    phone: "",
    facebookUrl: "",
    groupsText: "",
    additionalInfo: "",
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (res.status === 401) {
        toast.error("Эхлээд нэвтэрнэ үү.");
        router.push("/login?next=/moderator/apply");
        return;
      }
      if (!json.ok) {
        toast.error(json.error ?? "Өргөдөл илгээхэд алдаа гарлаа.");
        return;
      }
      setDone(true);
    } catch {
      toast.error("Сүлжээний алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Card className="animate-fade-up">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <span className="relative flex h-20 w-20 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-brand-500/30 animate-pulse-ring" />
            <CheckCircle2 className="relative h-12 w-12 text-brand-400" />
          </span>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Өргөдөл илгээгдлээ</h2>
          <p className="max-w-sm text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Admin баг таны өргөдлийг хянаж байна. Зөвшөөрөгдсөн тохиолдолд identity
            баталгаажуулалтаа эхлүүлэх боломжтой болно.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => router.push("/dashboard")}>Dashboard</Button>
            <Button variant="ghost" onClick={() => router.push("/")}>Нүүр хуудас</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={submit}>
      <Card>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Нэр *" placeholder="Бүтэн нэр" value={form.fullName} onChange={set("fullName")} required maxLength={80} />
            <Input label="Moderator нэр *" placeholder="Nickname" value={form.nickname} onChange={set("nickname")} required maxLength={40} />
          </div>
          <Input type="email" label="И-мэйл *" placeholder="tanii@email.mn" value={form.email} onChange={set("email")} required />
          <Input label="Утасны дугаар" placeholder="+976 …" value={form.phone} onChange={set("phone")} />
          <Input label="Facebook профайл линк" placeholder="https://facebook.com/…" value={form.facebookUrl} onChange={set("facebookUrl")} />
          <Textarea
            label="Ажиллах хүсэлтэй group-ууд"
            placeholder="Жишээ: Arhat Official, MLBB Mongolia Community"
            value={form.groupsText}
            onChange={set("groupsText")}
            hint="Хүсэлтэй group-уудаа таслалаар тусгаарлаж бичнэ үү."
          />
          <Textarea
            label="Нэмэлт мэдээлэл"
            placeholder="Туршлага, өмнөх ажлын мэдээлэл зэргийг бичиж болно"
            value={form.additionalInfo}
            onChange={set("additionalInfo")}
          />
          <Button type="submit" full size="lg" loading={submitting}>
            <Send className="h-4 w-4" /> Өргөдөл илгээх
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
