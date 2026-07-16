/**
 * REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-1 — branding helpers.
 * Restaurant logo when available; otherwise MineuQR logo image (never plain text logo).
 */
import { resolveImageUrl } from "@/lib/utils";

export type LogoImageAsset = Readonly<{
  buffer: ArrayBuffer;
  extension: "png" | "jpeg" | "gif";
  source: "restaurant" | "mineuqr";
}>;

function extensionFromContentType(contentType: string): LogoImageAsset["extension"] | null {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpeg";
  if (contentType.includes("gif")) return "gif";
  return null;
}

function extensionFromUrl(url: string): LogoImageAsset["extension"] | null {
  const lower = url.toLowerCase();
  if (lower.includes(".png")) return "png";
  if (lower.includes(".jpg") || lower.includes(".jpeg")) return "jpeg";
  if (lower.includes(".gif")) return "gif";
  return null;
}

async function fetchLogoFromUrl(
  url: string,
  source: LogoImageAsset["source"]
): Promise<LogoImageAsset | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    const extension =
      extensionFromContentType(contentType) || extensionFromUrl(url) || "png";
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0 || buffer.byteLength > 2_500_000) return null;
    return { buffer, extension, source };
  } catch {
    return null;
  }
}

async function fetchMineuqrLogoAsset(): Promise<LogoImageAsset | null> {
  // Browser / Vite public asset
  const fromPublic = await fetchLogoFromUrl("/mineuqr-logo.png", "mineuqr");
  if (fromPublic) return fromPublic;

  // Node / vitest fallback via filesystem
  try {
    const { readFileSync, existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    const candidates = [
      join(process.cwd(), "client/public/mineuqr-logo.png"),
      join(process.cwd(), "client/src/lib/reporting-exports/assets/mineuqr-logo.png"),
      join(process.cwd(), "dist/public/mineuqr-logo.png"),
    ];
    for (const path of candidates) {
      if (!existsSync(path)) continue;
      const buf = readFileSync(path);
      return {
        buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
        extension: "png",
        source: "mineuqr",
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Restaurant logo when present; otherwise MineuQR logo image. */
export async function resolveExportLogoAsset(
  logoUrl: string | null | undefined
): Promise<LogoImageAsset | null> {
  const resolved = resolveImageUrl(logoUrl);
  if (resolved) {
    const restaurant = await fetchLogoFromUrl(resolved, "restaurant");
    if (restaurant) return restaurant;
  }
  return fetchMineuqrLogoAsset();
}

/** @deprecated Use resolveExportLogoAsset */
export async function fetchRestaurantLogoAsset(
  logoUrl: string | null | undefined
): Promise<LogoImageAsset | null> {
  return resolveExportLogoAsset(logoUrl);
}
