export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: (() => {
    const isProduction = process.env.NODE_ENV === "production";
    const raw = process.env.JWT_SECRET ?? "";
    if (isProduction) return raw;

    // Development-only: replace weak/missing secrets with a stable strong secret
    // to avoid accidental weak JWT signing in local runs.
    const KNOWN_WEAK = new Set(["", "dev-local-jwt-secret-change-in-production", "change-me", "secret"]);
    const minLen = 32;
    const isWeak = !raw || KNOWN_WEAK.has(raw) || raw.length < minLen;
    if (!isWeak) return raw;

    // Stable across local restarts; never used in production.
    return "mineuqr-dev-jwt-secret-v1-please-set-JWT_SECRET-32+chars";
  })(),
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  r2AccountId: process.env.R2_ACCOUNT_ID ?? "",
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  r2BucketName: process.env.R2_BUCKET_NAME ?? "",
  r2PublicBaseUrl: process.env.R2_PUBLIC_BASE_URL ?? "",
  r2Endpoint: (() => {
    const explicit = process.env.R2_ENDPOINT?.trim();
    if (explicit) return explicit.replace(/\/+$/, "");
    const accountId = process.env.R2_ACCOUNT_ID?.trim();
    if (accountId) {
      return `https://${accountId}.r2.cloudflarestorage.com`;
    }
    return "";
  })(),
  // Email configuration
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailHost: process.env.EMAIL_HOST ?? "",
  emailPort: parseInt(process.env.EMAIL_PORT ?? "587"),
  emailUser: process.env.EMAIL_USER ?? "",
  emailPassword: process.env.EMAIL_PASSWORD ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "",
  emailSecure: process.env.EMAIL_SECURE === "true",
  // Tap Payments configuration
  tapSecretKey: process.env.TAP_SECRET_KEY ?? "",
  tapPublishableKey: process.env.VITE_TAP_PUBLISHABLE_KEY ?? "",
};
