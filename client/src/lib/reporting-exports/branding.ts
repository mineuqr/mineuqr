/**
 * REPORTING-EXPORT-TEMPLATES-1 — branding helpers (presentation only).
 * No hardcoded restaurant identity — values come from the export bundle.
 */
import { resolveImageUrl } from "@/lib/utils";

export type LogoImageAsset = Readonly<{
  buffer: ArrayBuffer;
  extension: "png" | "jpeg" | "gif";
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

/** Fetch restaurant logo for Excel/PDF embedding. Failures are non-fatal. */
export async function fetchRestaurantLogoAsset(
  logoUrl: string | null | undefined
): Promise<LogoImageAsset | null> {
  const resolved = resolveImageUrl(logoUrl);
  if (!resolved) return null;
  try {
    const response = await fetch(resolved);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    const extension =
      extensionFromContentType(contentType) || extensionFromUrl(resolved);
    if (!extension) return null;
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0 || buffer.byteLength > 2_500_000) return null;
    return { buffer, extension };
  } catch {
    return null;
  }
}
