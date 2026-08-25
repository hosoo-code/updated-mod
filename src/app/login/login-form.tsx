"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

export function LoginForm() {
  return (
    <Suspense>
      <LoginFormInner />
    </Suspense>
  );
}

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const next = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("И-мэйл, нууц үгээ оруулна уу.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? "Нэвтрэхэд алдаа гарлаа.");
        return;
      }
      toast.success("Амжилттай нэвтэрлээ.");
      router.push(json.data?.role === "admin" ? "/admin" : next);
      router.refresh();
    } catch {
      toast.error("Сүлжээний алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async (demoEmail: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail, password: "demo" }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? "Нэвтрэхэд алдаа гарлаа.");
        return;
      }
      toast.success("Demo горимоор нэвтэрлээ.");
      router.push(json.data?.role === "admin" ? "/admin" : "/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10">
          <ShieldCheck className="h-6 w-6 text-brand-500" />
        </div>
        <CardTitle className="text-xl">Нэвтрэх</CardTitle>
        <CardDescription>Moderator эсвэл admin эрхээр нэвтэрнэ үү.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
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
              label="Нууц үг"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
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
            Нэвтрэх
          </Button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-white/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-zinc-400 dark:bg-ink-900">DEMO хандалт</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Button variant="secondary" size="sm" onClick={() => demoLogin("mod@demo.mn")} disabled={loading}>
              Moderator demo
            </Button>
            <Button variant="secondary" size="sm" onClick={() => demoLogin("admin@demo.mn")} disabled={loading}>
              Admin demo
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
