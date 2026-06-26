/**
 * PRINTING-RENDERING-1A / 1B — canonical ticket rendering pipeline.
 *
 * Order → Ticket Builder → TicketDocument → Native Renderer → ESC/POS
 */
import type { AgentJobTicketPayload } from "../agentJobMessages";
import type { EscPosPayload } from "../executionExecutor";
import type { ArabicRenderingMode } from "../arabic/arabicRenderingMode";
import type { PaperWidthMm, PrintTicketLocale } from "../types";
import type { EscPosDocument } from "../escpos/escposTypes";
import type { ReceiptLayoutProfileId } from "../receipts/layoutProfiles";
import { ticketDocumentFromAgentPayload } from "./ticketDocumentFromPayload";
import { ticketDocumentToReceipt } from "./legacyReceiptAdapter";
import type { TicketDocument } from "./ticketTypes";
import {
  renderTicketDocumentToEscPosDocumentNative,
  renderTicketDocumentToEscPosPayloadLegacy,
  renderTicketDocumentToEscPosPayloadNative,
  type NativeTicketRendererOptions,
} from "./rendering/nativeTicketRenderer";
import type { TicketRenderingPolicyId } from "./rendering/renderingPolicy";
import type { TicketRenderDeviceCapabilities } from "./rendering/renderCapabilities";
import { renderReceiptToEscPosDocument } from "../receiptPipeline";

export type RenderTicketDocumentOptions = NativeTicketRendererOptions & {
  paperWidthMm?: PaperWidthMm;
  locale?: PrintTicketLocale;
  createdAt?: Date;
  useLegacyRenderer?: boolean;
};

export function renderTicketDocumentToReceipt(
  document: TicketDocument,
  options: RenderTicketDocumentOptions = {}
) {
  return ticketDocumentToReceipt(document, {
    paperWidthMm: options.paperWidthMm ?? document.renderHints?.paperWidthMm,
  });
}

export function renderTicketDocumentToEscPosDocument(
  document: TicketDocument,
  options: RenderTicketDocumentOptions = {}
): EscPosDocument {
  if (options.useLegacyRenderer) {
    const receipt = ticketDocumentToReceipt(document, {
      paperWidthMm: options.paperWidthMm ?? document.renderHints?.paperWidthMm,
    });
    return renderReceiptToEscPosDocument(receipt, {
      layoutProfileId: options.layoutProfileId,
      arabicRenderingMode: options.arabicRenderingMode,
    });
  }
  return renderTicketDocumentToEscPosDocumentNative(document, options);
}

export function renderTicketDocumentToEscPosPayload(
  document: TicketDocument,
  options: RenderTicketDocumentOptions = {}
): EscPosPayload {
  if (options.useLegacyRenderer) {
    return renderTicketDocumentToEscPosPayloadLegacy(document, options);
  }
  return renderTicketDocumentToEscPosPayloadNative(document, options);
}

export function renderAgentTicketPayloadToEscPosPayload(input: {
  ticket: AgentJobTicketPayload;
  createdAt?: Date;
  paperWidthMm?: PaperWidthMm;
  arabicRenderingMode?: ArabicRenderingMode;
  locale?: PrintTicketLocale;
  layoutProfileId?: ReceiptLayoutProfileId;
  policyId?: TicketRenderingPolicyId;
  capabilities?: TicketRenderDeviceCapabilities;
  useLegacyRenderer?: boolean;
}): EscPosPayload {
  const document = ticketDocumentFromAgentPayload(input.ticket, {
    createdAt: input.createdAt,
    locale: input.locale,
  });

  if (input.paperWidthMm) {
    document.renderHints = {
      ...document.renderHints,
      paperWidthMm: input.paperWidthMm,
    };
  }

  return renderTicketDocumentToEscPosPayload(document, {
    arabicRenderingMode: input.arabicRenderingMode,
    paperWidthMm: input.paperWidthMm,
    locale: input.locale,
    createdAt: input.createdAt,
    layoutProfileId: input.layoutProfileId,
    policyId: input.policyId,
    capabilities: input.capabilities,
    useLegacyRenderer: input.useLegacyRenderer,
  });
}

// Re-export native renderer utilities for tests and parity tooling.
export {
  renderTicketDocumentToEscPosDocumentNative,
  renderTicketDocumentToEscPosPayloadLegacy,
  renderTicketDocumentToEscPosPayloadNative,
} from "./rendering/nativeTicketRenderer";
export { buildTicketLayoutPlan } from "./rendering/ticketLayoutEngine";
export type { TicketRenderingPolicy, TicketRenderingPolicyId } from "./rendering/renderingPolicy";
export {
  KITCHEN_RENDERING_POLICY,
  CUSTOMER_RECEIPT_RENDERING_POLICY,
  PACKING_RENDERING_POLICY,
} from "./rendering/renderingPolicy";
