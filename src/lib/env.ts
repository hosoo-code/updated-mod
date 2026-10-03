/**
 * Server-side environment access.
 * Real secret-үүд зөвхөн server дээр ачаалагдана — client bundle-д орохгүй.
 */

export function serverEnv() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    r2AccountId: process.env.R2_ACCOUNT_ID ?? "",
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    r2BucketName: process.env.R2_BUCKET_NAME ?? "",
    r2Endpoint: process.env.R2_ENDPOINT ?? "",
    cronSecret: process.env.CRON_SECRET ?? "",
    appUrl: process.env.APP_URL ?? "",
  };
}

export function isSupabaseConfigured(): boolean {
  const env = serverEnv();
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function isR2Configured(): boolean {
  const env = serverEnv();
  return Boolean(
    env.r2AccountId &&
      env.r2AccessKeyId &&
      env.r2SecretAccessKey &&
      env.r2BucketName
  );
}
