/** @type {import('next').NextConfig} */

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), geolocation=(self), microphone=()",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // X-Frame-Options-ийг зориуд тавиагүй: preview/proxy орчинд iframe-ээр
  // үзэх шаардлагатай. Session cookie-ууд SameSite=Lax тул CSRF эрсдэл
  // бага, нэмэлтээр origin шалгалт хийдэг (lib/security).
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  images: {
    // Signed R2 URL-үүд болон динамик avatar-уудад next/image-ийн optimizer
    // тохиромжгүй тул зөвхөн тодорхой remote-ийг зөвшөөрнө.
    remotePatterns: [],
    unoptimized: true,
  },
};

export default nextConfig;
