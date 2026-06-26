/**
 * PRINTING-RENDERING-1A — canonical ticket rendering pipeline.
 *
 * Order → Ticket Builder → TicketDocument → Rendering Pipeline → Legacy Adapter → ESC/POS
 */
import type { AgentJobTicketPayload } from "../agentJobMessages";
import type { EscPosPayload } from "../executionExecutor";
import type { ArabicRenderingMode } from "../arabic/arabicRenderingMode";
import type { PaperWidthMm, PrintTicketLocale } from "../types";
import type { EscPosDocument } from "../escpos/escposTypes";
import { renderReceiptToEscPosDocument, renderReceiptToEscPosPayload } from "../receiptPipeline";
import type { RenderReceiptOptions } from "../receiptPipeline";
import { ticketDocumentFromAgentPayload } from "./ticketDocumentFromPayload";
import { ticketDocumentToReceipt } from "./legacyReceiptAdapter";
import type { TicketDocument } from "./ticketTypes";

export type RenderTicketDocumentOptions = RenderReceiptOptions & {
  paperWidthMm?: PaperWidthMm;
  locale?: PrintTicketLocale;
  createdAt?: Date;
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
  const receipt = renderTicketDocumentToReceipt(document, options);
  return renderReceiptToEscPosDocument(receipt, options);
}

export function renderTicketDocumentToEscPosPayload(
  document: TicketDocument,
  options: RenderTicketDocumentOptions = {}
): EscPosPayload {
  const receipt = renderTicketDocumentToReceipt(document, options);
  return renderReceiptToEscPosPayload(receipt, options);
}

export function renderAgentTicketPayloadToEscPosPayload(input: {
  ticket: AgentJobTicketPayload;
  createdAt?: Date;
  paperWidthMm?: PaperWidthMm;
  arabicRenderingMode?: ArabicRenderingMode;
  locale?: PrintTicketLocale;
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
  });
}
