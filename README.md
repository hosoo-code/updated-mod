# ARHAT MODERATOR

Moderator мэдээлэл ба баталгаажуулалтын premium платформ (Mobile Legends нийгэмлэгт зориулсан).
Монгол хэл дээрх, dark/light горимтой, mobile-first, мэргэжлийн fintech/security дизайнтай.

## Онцлогууд

- **Moderator профайл** — нийтийн профайл, ✓ VERIFIED MODERATOR badge (tooltip-тэй)
- **Identity verification wizard** — 7 алхамтай: Хувийн мэдээлэл → Зөвшөөрөл → Баримт (камер) → Нүүр (face detection + liveness) → Байршил (заавал биш) → Хяналт → Дууссан
- **Camera-only capture** — `<input type="file">` болон gallery upload БАЙХГҮЙ; document frame + real-time guidance (бүдэг/харанхуй/баримт олдоогүй)
- **Face verification** — MediaPipe BlazeFace (CDN runtime) / native FaceDetector fallback; толгой эргүүлэх liveness; **биометрийн identity matching биш**
- **7 хоногийн баталгаажуулалт** — user өөрөө эхлүүлсэн үед л ажиллана; IP зөвхөн сервер талд бүртгэгдэнэ
- **Admin dashboard** — Dashboard, Moderators, Өргөдлүүд, Verifications, Groups, Үнэ, Payment Accounts, Locations, IP History, Audit Logs, Settings
- **Cloudflare R2 private bucket** — short-lived signed URL; public URL байхгүй; retention-тэй
- **Supabase RLS** — column-level grants + эзэмшигч/admin бодлогууд
- **Аюулгүй байдал** — Zod validation, rate limiting, same-origin (CSRF) шалгалт, file type/size/magic-byte шалгалт, IDOR хамгаалалт, secure headers, IP logging зөвхөн сервер талд

## Stack

Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS · Supabase (Auth + PostgreSQL + RLS) · Cloudflare R2 · Zod · AWS SDK v3 (S3 presigned) · MediaPipe

## Эхлүүлэх

```bash
npm install
cp .env.example .env.local   # бодит утгуудыг оруулна
npm run dev                  # http://localhost:3000
```

### Supabase setup

1. Supabase project үүсгэж, **`supabase/schema.sql`**-ийг SQL Editor дээр ажиллуулна.
2. `.env.local`-д `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` оруулна.
3. Admin болгох: `profiles`-д хэрэглэгчийн `role='super_admin'` тавиад `admin_users`-д бүртгэнэ.

### Cloudflare R2 setup

1. R2 bucket үүсгэх — **PRIVATE** байх ёстой (public биш).
2. R2 API token үүсгэж `.env.local`-д `R2_*` утгуудыг оруулна.

### Retention cron

`POST /api/cron/retention` — `x-cron-secret: <CRON_SECRET>` header-тэйгээр дуудагдана
(Vercel Cron / Cloudflare Workers cron). Хугацаа хэтэрсэн identity баримтууд R2-оос устана.

## DEMO горим

Supabase/R2 тохируулаагүй үед автоматаар **demo горим** ажиллана (дээд талд шар тууз харагдана):

- **mod@demo.mn** — moderator demo (ямар ч нууц үг)
- **admin@demo.mn** — admin demo

Demo горимд өгөгдөл in-memory (зохиомол) бөгөөд сервер restart хийхэд шинэчлэгдэнэ.
Production-д `DISABLE_DEMO_MODE=true` тавьж болно.

## Хөгжүүлэлт

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript strict
npm run build       # Production build
```

## Аюулгүй байдлын тэмдэглэл

- `SUPABASE_SERVICE_ROLE_KEY`, `R2_SECRET_ACCESS_KEY`, `CRON_SECRET` зөвхөн server-side ашиглагдана (`src/lib/env.ts`).
- Identity баримтын binary PostgreSQL-д хадгалагдахгүй — зөвхөн R2 object key + metadata.
- Object key-ийг зөвхөн сервер үүсгэнэ; download нь эзэмшигч эсвэл admin-д л зөвшөөрөгдөнө (IDOR хамгаалалт).
- Байршил зөвхөн ойролцоо (2 аравтын орон ≈ ±1км) хадгалагдана; public API-д координат гардаггүй.
- IP бүртгэл зөвхөн сервер талд (`x-forwarded-for`), нийтэд харагдахгүй.
- Camera stream-ууд component unmount үед бүрэн зогсдог; canvas capture нь EXIF-гүй зураг үүсгэдэг.
- Биометрийн identity matching / face embedding хийгддэггүй — зөвхөн face detection + liveness guidance; эцсийн шийдвэрийг admin хяналт гаргадаг.
