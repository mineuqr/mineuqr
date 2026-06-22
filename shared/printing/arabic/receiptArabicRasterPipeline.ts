/**
 * THERMAL-PRINTING-13D.6 — Arabic raster receipt → ESC/POS document.
 */
import { buildReceiptRenderPlan } from "../receipts/layoutEngine";
import { resolveReceiptLayoutProfile } from "../receipts/layoutProfiles";
import type { Receipt } from "../receipts/receiptTypes";
import type { ReceiptLayoutProfileId } from "../receipts/layoutProfiles";
import {
  buildRenderableReceiptFromPlan,
} from "./arabicTextEngine";
import { resolveReceiptRasterWidthPx } from "./receiptBitmapConstants";
import { renderRenderableReceiptToBitmap } from "./receiptBitmapRenderer";
import { receiptBitmapToEscPosDocument } from "../escpos/receiptRasterEscPosRenderer";

export type ArabicRasterRenderOptions = {
  layoutProfileId?: ReceiptLayoutProfileId;
};

export function renderReceiptArabicRasterToEscPosDocument(
  receipt: Receipt,
  options: ArabicRasterRenderOptions = {}
) {
  const profile = resolveReceiptLayoutProfile({
    paperWidthMm: receipt.paperWidthMm,
    profileId: options.layoutProfileId,
  });
  const plan = buildReceiptRenderPlan(receipt, profile);
  const renderable = buildRenderableReceiptFromPlan(plan);
  const widthPx = resolveReceiptRasterWidthPx(receipt.paperWidthMm);
  const bitmap = renderRenderableReceiptToBitmap(renderable, { widthPx });

  return receiptBitmapToEscPosDocument(bitmap, {
    feedLines: plan.feedLines,
    cut: plan.cut,
  });
}
