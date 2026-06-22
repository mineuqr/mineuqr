/**
 * THERMAL-PRINTING-13B / 13D — unified receipt rendering pipeline.
 *
 * Order Data → Canonical Receipt → Layout Engine → Rendering Strategy → ESC/POS → Bytes
 */
import { ESC_POS_PAYLOAD_KIND, type EscPosPayload } from "./executionExecutor";
import { encodeEscPosDocument } from "./escpos/escposDocumentRenderer";
import { receiptRenderPlanToEscPosDocument } from "./escpos/receiptEscPosRenderer";
import { renderReceiptArabicRasterToEscPosDocument } from "./arabic/receiptArabicRasterPipeline";
import { resolveReceiptRenderingPath } from "./arabic/receiptRenderingStrategy";
import {
  DEFAULT_ARABIC_RENDERING_MODE,
  type ArabicRenderingMode,
} from "./arabic/arabicRenderingMode";
import { buildReceiptRenderPlan } from "./receipts/layoutEngine";
import {
  resolveReceiptLayoutProfile,
  type ReceiptLayoutProfileId,
} from "./receipts/layoutProfiles";
import type { Receipt } from "./receipts/receiptTypes";
import type { EscPosDocument } from "./escpos/escposTypes";

export type RenderReceiptOptions = {
  layoutProfileId?: ReceiptLayoutProfileId;
  arabicRenderingMode?: ArabicRenderingMode;
};

export function renderReceiptToEscPosDocument(
  receipt: Receipt,
  options: RenderReceiptOptions = {}
): EscPosDocument {
  const renderingPath = resolveReceiptRenderingPath({
    arabicRenderingMode: options.arabicRenderingMode ?? DEFAULT_ARABIC_RENDERING_MODE,
    receipt,
  });

  if (renderingPath === "arabic-raster") {
    return renderReceiptArabicRasterToEscPosDocument(receipt, {
      layoutProfileId: options.layoutProfileId,
    });
  }

  const profile = resolveReceiptLayoutProfile({
    paperWidthMm: receipt.paperWidthMm,
    profileId: options.layoutProfileId,
  });
  const plan = buildReceiptRenderPlan(receipt, profile);
  return receiptRenderPlanToEscPosDocument(plan);
}

export function renderReceiptToEscPosPayload(
  receipt: Receipt,
  options: RenderReceiptOptions = {}
): EscPosPayload {
  const document = renderReceiptToEscPosDocument(receipt, options);
  const bytes = encodeEscPosDocument(document);
  return {
    kind: ESC_POS_PAYLOAD_KIND,
    bytes,
    byteLength: bytes.length,
    encoding: "escpos",
  };
}
