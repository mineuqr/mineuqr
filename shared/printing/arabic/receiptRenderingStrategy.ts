/**
 * THERMAL-PRINTING-13D.5 — rendering strategy selection (per-printer, no hardcoded IDs).
 */
import {
  DEFAULT_ARABIC_RENDERING_MODE,
  type ArabicRenderingMode,
} from "../arabic/arabicRenderingMode";
import { receiptRequiresArabicRendering } from "../arabic/arabicContent";
import type { PrinterProfile } from "../printerProfiles";
import type { Receipt } from "../receipts/receiptTypes";

export const RECEIPT_RENDERING_PATHS = ["legacy-escpos", "arabic-raster"] as const;

export type ReceiptRenderingPath = (typeof RECEIPT_RENDERING_PATHS)[number];

export function resolveReceiptRenderingPath(input: {
  arabicRenderingMode?: ArabicRenderingMode;
  receipt: Receipt;
}): ReceiptRenderingPath {
  const mode = input.arabicRenderingMode ?? DEFAULT_ARABIC_RENDERING_MODE;

  switch (mode) {
    case "disabled":
    case "escpos-codepage":
      return "legacy-escpos";
    case "raster":
      return "arabic-raster";
    case "auto":
    default:
      return receiptRequiresArabicRendering(input.receipt) ? "arabic-raster" : "legacy-escpos";
  }
}

export function resolveArabicRenderingModeFromPrinterProfile(
  profile: PrinterProfile | undefined
): ArabicRenderingMode {
  return profile?.arabicRenderingMode ?? DEFAULT_ARABIC_RENDERING_MODE;
}
