/**
 * THERMAL-PRINTING-13B — unified receipt rendering pipeline.
 *
 * Order Data → Canonical Receipt → Layout Engine → ESC/POS Document → Bytes
 */
import { ESC_POS_PAYLOAD_KIND, type EscPosPayload } from "./executionExecutor";
import { encodeEscPosDocument } from "./escpos/escposDocumentRenderer";
import { receiptRenderPlanToEscPosDocument } from "./escpos/receiptEscPosRenderer";
import { buildReceiptRenderPlan } from "./receipts/layoutEngine";
import {
  resolveReceiptLayoutProfile,
  type ReceiptLayoutProfileId,
} from "./receipts/layoutProfiles";
import type { Receipt } from "./receipts/receiptTypes";
import type { EscPosDocument } from "./escpos/escposTypes";

export type RenderReceiptOptions = {
  layoutProfileId?: ReceiptLayoutProfileId;
};

export function renderReceiptToEscPosDocument(
  receipt: Receipt,
  options: RenderReceiptOptions = {}
): EscPosDocument {
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
