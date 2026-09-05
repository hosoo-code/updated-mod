import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Admin layout — СЕРВЕР ТАЛД admin эсэхийг шалгана.
 * Client-ийн ямар ч тохиргооноос үл хамааран эрхгүй хүн орж чадахгүй.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-screen lg:flex">
      <AdminSidebar adminName={user.fullName ?? "Админ"} />
      <div className="flex-1 lg:pl-64">
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
