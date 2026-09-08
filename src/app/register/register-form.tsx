"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ShieldCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

export function RegisterForm() {
  const router = useRouter();
  const toast = useToast();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) {
      toast.error("Бүх талбарыг бөглөнө үү.");
      return;
    }
    if (password.length < 8) {
      toast.error("Нууц үг 8-аас доошгүй тэмдэгт байх ёстой.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? "Бүртгэл үүсгэхэд алдаа гарлаа.");
        return;
      }
      if (json.data?.needsEmailConfirm) {
        setConfirmed(true);
        toast.success("Бүртгэл үүслээ. И-мэйлээ баталгаажуулна уу.");
        return;
      }
      toast.success("Амжилттай бүртгүүллээ. Нэвтэрнэ үү.");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Сүлжээний алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10">
          {confirmed ? <ShieldCheck className="h-6 w-6 text-brand-500" /> : <UserPlus className="h-6 w-6 text-brand-500" />}
        </div>
        <CardTitle className="text-xl">{confirmed ? "И-мэйл баталгаажуулалт" : "Бүртгүүлэх"}</CardTitle>
        <CardDescription>
          {confirmed
            ? "Таны и-мэйлд баталгаажуулах холбоос илгээгдлээ. Холбоосыг нээсний дараа нэвтрэх боломжтой."
            : "Moderator болох анкетаа эхлүүлэхийн тулд бүртгүүлнэ үү."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!confirmed ? (
          <form onSubmit={submit} className="space-y-4">
            <Input
              label="Нэр"
              placeholder="Таны бүтэн нэр"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
            <Input
              type="email"
              label="И-мэйл"
              placeholder="tanii@email.mn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                label="Нууц үг (хамгийн багадаа 8 тэмдэгт)"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Нууц үгийг нуух" : "Нууц үгийг харуулах"}
                className="absolute bottom-2.5 right-3 text-zinc-400 transition hover:text-zinc-700 dark:hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button type="submit" full loading={loading}>
              Бүртгүүлэх
            </Button>
          </form>
        ) : (
          <Button full onClick={() => router.push("/login")}>
            Нэвтрэх хуудас руу
          </Button>
        )}

        <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Бүртгэлтэй юу?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-300">
            Нэвтрэх
          </Link>
        </p>
        <p className="mt-3 text-center text-xs text-zinc-400 dark:text-zinc-600">
          Demo горимд бүртгэл нээх шаардлагагүй — нэвтрэх хуудасны demo хандалтыг ашиглана уу.
        </p>
      </CardContent>
    </Card>
  );
}
