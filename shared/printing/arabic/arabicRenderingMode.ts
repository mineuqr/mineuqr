/**
 * THERMAL-PRINTING-13D.1 — Arabic rendering capability model.
 *
 * Per-printer Arabic output strategy. Existing profiles without this field
 * default to `auto` at validation time (backward compatible).
 */
export const ARABIC_RENDERING_MODES = [
  "auto",
  "raster",
  "escpos-codepage",
  "disabled",
] as const;

export type ArabicRenderingMode = (typeof ARABIC_RENDERING_MODES)[number];

export const DEFAULT_ARABIC_RENDERING_MODE: ArabicRenderingMode = "auto";

export function isArabicRenderingMode(value: string): value is ArabicRenderingMode {
  return (ARABIC_RENDERING_MODES as readonly string[]).includes(value);
}

export function normalizeArabicRenderingMode(value: unknown): ArabicRenderingMode {
  if (typeof value === "string" && isArabicRenderingMode(value)) {
    return value;
  }
  return DEFAULT_ARABIC_RENDERING_MODE;
}
