import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { DemoBanner } from "@/components/layout/demo-banner";
import "./globals.css";

// Self-hosted Inter (latin + cyrillic) — Монгол хэлний typography зөв харагдана.
// next/font/google нь build орчинд network хандалт шаарддаг тул
// fontsource package-аар bundle хийсэн (offline build ажиллана).

export const metadata: Metadata = {
  title: {
    default: "ARHAT MODERATOR — Баталгаатай Moderator-ууд",
    template: "%s · ARHAT MODERATOR",
  },
  description:
    "Moderator-ийн мэдээлэл, group, үйлчилгээ болон баталгаажуулалтыг нэг дор. Mobile Legends нийгэмлэгийн итгэлцлийн платформ.",
  applicationName: "ARHAT MODERATOR",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%2310B981'/%3E%3Cpath d='M16 6l8 3.5v6c0 5-3.4 8.6-8 10.5-4.6-1.9-8-5.5-8-10.5v-6L16 6z' fill='white'/%3E%3Cpath d='M11.5 16l3 3 6-6' stroke='%2310B981' stroke-width='2.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#05070d" },
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="mn" suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <ThemeProvider>
          <ToastProvider>
            <DemoBanner />
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
