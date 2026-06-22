/**
 * THERMAL-PRINTING-10A / 13B / 13C / 13D — ESC/POS payload generation (unified pipeline entry).
 */
import type { AgentJobTicketPayload } from "./agentJobMessages";
import type { EscPosPayload } from "./executionExecutor";
import type { ArabicRenderingMode } from "./arabic/arabicRenderingMode";
import type { PaperWidthMm, PrintTicketLocale } from "./types";
import { receiptFromAgentJobTicket } from "./receipts/receiptAdapters";
import { renderReceiptToEscPosPayload } from "./receiptPipeline";

export function buildEscPosPayloadFromAgentTicket(input: {
  ticket: AgentJobTicketPayload;
  createdAt?: Date;
  paperWidthMm?: PaperWidthMm;
  arabicRenderingMode?: ArabicRenderingMode;
  locale?: PrintTicketLocale;
}): EscPosPayload {
  const receipt = receiptFromAgentJobTicket(input.ticket, {
    createdAt: input.createdAt,
    paperWidthMm: input.paperWidthMm,
    locale: input.locale,
  });

  return renderReceiptToEscPosPayload(receipt, {
    arabicRenderingMode: input.arabicRenderingMode,
  });
}
