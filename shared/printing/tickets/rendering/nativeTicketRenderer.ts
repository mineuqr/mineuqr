/**
 * PRINTING-RENDERING-1B — native TicketDocument renderer (primary path).
 */
import {
  DEFAULT_ARABIC_RENDERING_MODE,
  type ArabicRenderingMode,
} from "../../arabic/arabicRenderingMode";
import { encodeEscPosDocument } from "../../escpos/escposDocumentRenderer";
import type { EscPosDocument } from "../../escpos/escposTypes";
import { ESC_POS_PAYLOAD_KIND, type EscPosPayload } from "../../executionExecutor";
import type { PaperWidthMm } from "../../types";
import type { ReceiptLayoutProfileId } from "../../receipts/layoutProfiles";
import type { TicketDocument } from "../ticketTypes";
import { ticketDocumentToReceipt } from "../legacyReceiptAdapter";
import { renderReceiptToEscPosDocument } from "../../receiptPipeline";
import { buildTicketLayoutPlan } from "./ticketLayoutEngine";
import { ticketLayoutPlanToEscPosDocument } from "./ticketEscPosRenderer";
import { ticketLayoutPlanToArabicRasterEscPosDocument } from "./ticketArabicRasterBridge";
import { ticketDocumentRequiresArabicRendering } from "./ticketArabicDetection";
import type { TicketRenderingPolicyId } from "./renderingPolicy";
import type { TicketRenderDeviceCapabilities } from "./renderCapabilities";

export type NativeTicketRendererOptions = {
  layoutProfileId?: ReceiptLayoutProfileId;
  arabicRenderingMode?: ArabicRenderingMode;
  paperWidthMm?: PaperWidthMm;
  policyId?: TicketRenderingPolicyId;
  capabilities?: TicketRenderDeviceCapabilities;
};

export function renderTicketDocumentToEscPosDocumentNative(
  document: TicketDocument,
  options: NativeTicketRendererOptions = {}
): EscPosDocument {
  if (options.paperWidthMm) {
    document = {
      ...document,
      renderHints: { ...document.renderHints, paperWidthMm: options.paperWidthMm },
    };
  }

  const plan = buildTicketLayoutPlan({
    document,
    policyId: options.policyId,
    layoutProfileId: options.layoutProfileId,
  });

  const arabicMode = options.arabicRenderingMode ?? DEFAULT_ARABIC_RENDERING_MODE;
  if (ticketDocumentRequiresArabicRendering(document, arabicMode)) {
    return ticketLayoutPlanToArabicRasterEscPosDocument(plan);
  }

  return ticketLayoutPlanToEscPosDocument(plan, {
    capabilities: options.capabilities,
  });
}

export function renderTicketDocumentToEscPosPayloadNative(
  document: TicketDocument,
  options: NativeTicketRendererOptions = {}
): EscPosPayload {
  const escposDocument = renderTicketDocumentToEscPosDocumentNative(document, options);
  const bytes = encodeEscPosDocument(escposDocument);
  return {
    kind: ESC_POS_PAYLOAD_KIND,
    bytes,
    byteLength: bytes.length,
    encoding: "escpos",
  };
}

/** Legacy receipt-adapter path retained for parity validation only. */
export function renderTicketDocumentToEscPosPayloadLegacy(
  document: TicketDocument,
  options: NativeTicketRendererOptions = {}
): EscPosPayload {
  const receipt = ticketDocumentToReceipt(document, {
    paperWidthMm: options.paperWidthMm ?? document.renderHints?.paperWidthMm,
  });
  const escposDocument = renderReceiptToEscPosDocument(receipt, {
    layoutProfileId: options.layoutProfileId,
    arabicRenderingMode: options.arabicRenderingMode,
  });
  const bytes = encodeEscPosDocument(escposDocument);
  return {
    kind: ESC_POS_PAYLOAD_KIND,
    bytes,
    byteLength: bytes.length,
    encoding: "escpos",
  };
}
