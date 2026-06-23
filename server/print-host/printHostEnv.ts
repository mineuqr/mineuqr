/**
 * THERMAL-PRINTING-12E.1B — print host runtime environment.
 */
function parseCsv(value: string | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

const DEFAULT_DEV_CORS_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const DEFAULT_PRODUCTION_CORS_ORIGINS = [
  "https://mineuqr.com",
  "https://www.mineuqr.com",
];

export const PRINT_HOST_ENV = {
  port: Number.parseInt(process.env.PORT ?? process.env.PRINT_HOST_PORT ?? "8080", 10),
  corsOrigins: (() => {
    const configured = parseCsv(process.env.PRINT_HOST_CORS_ORIGINS);
    if (configured.length > 0) {
      return configured;
    }
    return process.env.NODE_ENV === "production"
      ? DEFAULT_PRODUCTION_CORS_ORIGINS
      : DEFAULT_DEV_CORS_ORIGINS;
  })(),
  publicUrl: process.env.PRINT_HOST_PUBLIC_URL?.trim() ?? "",
  /** THERMAL-PRINTING-13H — shared secret for Vercel → Print Host dispatch bridge. */
  apiKey: process.env.PRINT_HOST_API_KEY ?? "",
} as const;

export function validatePrintHostDispatchAuthReadiness(): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }
  if (!PRINT_HOST_ENV.apiKey) {
    console.warn(
      "[PrintHost] PRINT_HOST_API_KEY is unset: dispatch bridge requests will be rejected in production."
    );
  }
}

export function resolvePrintHostTrpcUrl(): string {
  const base = PRINT_HOST_ENV.publicUrl.replace(/\/$/, "");
  if (!base) {
    return "/api/trpc";
  }
  return base.endsWith("/api/trpc") ? base : `${base}/api/trpc`;
}
