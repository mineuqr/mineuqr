/**
 * THERMAL-PRINTING-13B — width-aware receipt layout profiles.
 */
import { PAPER_WIDTH_MM, type PaperWidthMm } from "../types";

export type ReceiptLayoutProfileId = "w58" | "w80" | "legacy-v1";

export type ReceiptLayoutProfile = {
  id: ReceiptLayoutProfileId;
  paperWidthMm: PaperWidthMm;
  /** Characters per line at Font A (12×24) for typical thermal printers. */
  charactersPerLine: number;
  separatorLength: number;
  quantityColumnWidth: number;
  supportsWrapping: boolean;
};

export const RECEIPT_LAYOUT_PROFILE_W58: ReceiptLayoutProfile = {
  id: "w58",
  paperWidthMm: PAPER_WIDTH_MM.W58,
  charactersPerLine: 32,
  separatorLength: 32,
  quantityColumnWidth: 4,
  supportsWrapping: false,
};

export const RECEIPT_LAYOUT_PROFILE_W80: ReceiptLayoutProfile = {
  id: "w80",
  paperWidthMm: PAPER_WIDTH_MM.W80,
  charactersPerLine: 48,
  separatorLength: 48,
  quantityColumnWidth: 4,
  supportsWrapping: false,
};

/**
 * Preserves THERMAL-PRINTING-10A production byte output (32-char separator on all widths).
 */
export const RECEIPT_LAYOUT_PROFILE_LEGACY_V1: ReceiptLayoutProfile = {
  id: "legacy-v1",
  paperWidthMm: PAPER_WIDTH_MM.W80,
  charactersPerLine: 32,
  separatorLength: 32,
  quantityColumnWidth: 4,
  supportsWrapping: false,
};

export function resolveReceiptLayoutProfile(input: {
  paperWidthMm?: PaperWidthMm;
  profileId?: ReceiptLayoutProfileId;
}): ReceiptLayoutProfile {
  if (input.profileId === "legacy-v1") {
    return RECEIPT_LAYOUT_PROFILE_LEGACY_V1;
  }
  if (input.profileId === "w58") {
    return RECEIPT_LAYOUT_PROFILE_W58;
  }
  if (input.profileId === "w80") {
    return RECEIPT_LAYOUT_PROFILE_W80;
  }

  switch (input.paperWidthMm) {
    case PAPER_WIDTH_MM.W58:
      return RECEIPT_LAYOUT_PROFILE_W58;
    case PAPER_WIDTH_MM.W80:
      return RECEIPT_LAYOUT_PROFILE_W80;
    default:
      return RECEIPT_LAYOUT_PROFILE_LEGACY_V1;
  }
}

export function buildSeparatorLine(profile: ReceiptLayoutProfile, char = "-"): string {
  return char.repeat(profile.separatorLength);
}
