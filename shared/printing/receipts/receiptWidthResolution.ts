/**
 * THERMAL-PRINTING-13C — printer width → layout profile resolution.
 */
import type { PrinterProfile } from "../printerProfiles";
import { isPrinterProfilePaperWidth } from "../printerProfiles";
import { PAPER_WIDTH_MM, type PaperWidthMm } from "../types";
import type { ReceiptLayoutProfileId } from "./layoutProfiles";

/**
 * Authoritative width source: agent-reported `PrinterProfile.paperWidth`
 * (negotiated via PROFILES_REPORT / startup printer registration).
 */
export function resolvePaperWidthFromPrinterProfile(
  profile: PrinterProfile | undefined
): PaperWidthMm | undefined {
  if (!profile) {
    return undefined;
  }

  if (!isPrinterProfilePaperWidth(profile.paperWidth)) {
    return undefined;
  }

  return profile.paperWidth;
}

export function resolveLayoutProfileIdFromPaperWidth(
  paperWidthMm: PaperWidthMm | undefined
): ReceiptLayoutProfileId {
  switch (paperWidthMm) {
    case PAPER_WIDTH_MM.W58:
      return "w58";
    case PAPER_WIDTH_MM.W80:
      return "w80";
    default:
      return "legacy-v1";
  }
}

export function resolveLayoutProfileIdFromPrinterProfile(
  profile: PrinterProfile | undefined
): ReceiptLayoutProfileId {
  return resolveLayoutProfileIdFromPaperWidth(
    resolvePaperWidthFromPrinterProfile(profile)
  );
}
