/**
 * THERMAL-PRINTING-13D.3 — width-aware raster targets for thermal rolls.
 */
import { PAPER_WIDTH_MM, type PaperWidthMm } from "../types";

export const RECEIPT_RASTER_WIDTH_PX = {
  [PAPER_WIDTH_MM.W58]: 384,
  [PAPER_WIDTH_MM.W80]: 576,
} as const satisfies Record<PaperWidthMm, number>;

export const RECEIPT_RASTER_DEFAULT_WIDTH_PX = RECEIPT_RASTER_WIDTH_PX[PAPER_WIDTH_MM.W58];

export const RECEIPT_RASTER_FONT_SIZE_PX = 22;
export const RECEIPT_RASTER_LINE_HEIGHT_PX = 30;
export const RECEIPT_RASTER_PADDING_X_PX = 8;
export const RECEIPT_RASTER_PADDING_Y_PX = 10;

export function resolveReceiptRasterWidthPx(paperWidthMm?: PaperWidthMm): number {
  if (paperWidthMm === PAPER_WIDTH_MM.W58) {
    return RECEIPT_RASTER_WIDTH_PX[PAPER_WIDTH_MM.W58];
  }
  if (paperWidthMm === PAPER_WIDTH_MM.W80) {
    return RECEIPT_RASTER_WIDTH_PX[PAPER_WIDTH_MM.W80];
  }
  return RECEIPT_RASTER_DEFAULT_WIDTH_PX;
}
