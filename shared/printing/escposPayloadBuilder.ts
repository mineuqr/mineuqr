/**
 * THERMAL-PRINTING-10A / 13B / 13C — ESC/POS payload generation (unified pipeline entry).
 */
import type { AgentJobTicketPayload } from "./agentJobMessages";
import type { EscPosPayload } from "./executionExecutor";
import type { PaperWidthMm } from "./types";
import { receiptFromAgentJobTicket } from "./receipts/receiptAdapters";
import { renderReceiptToEscPosPayload } from "./receiptPipeline";

export function buildEscPosPayloadFromAgentTicket(input: {
  ticket: AgentJobTicketPayload;
  createdAt?: Date;
  paperWidthMm?: PaperWidthMm;
}): EscPosPayload {
  const receipt = receiptFromAgentJobTicket(input.ticket, {
    createdAt: input.createdAt,
    paperWidthMm: input.paperWidthMm,
  });

  return renderReceiptToEscPosPayload(receipt);
}
