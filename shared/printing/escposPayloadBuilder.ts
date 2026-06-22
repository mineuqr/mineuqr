/**
 * THERMAL-PRINTING-10A / 13B — ESC/POS payload generation (unified pipeline entry).
 */
import type { AgentJobTicketPayload } from "./agentJobMessages";
import type { EscPosPayload } from "./executionExecutor";
import { receiptFromAgentJobTicket } from "./receipts/receiptAdapters";
import { renderReceiptToEscPosPayload } from "./receiptPipeline";

export function buildEscPosPayloadFromAgentTicket(input: {
  ticket: AgentJobTicketPayload;
  createdAt?: Date;
}): EscPosPayload {
  const receipt = receiptFromAgentJobTicket(input.ticket, {
    createdAt: input.createdAt,
  });

  return renderReceiptToEscPosPayload(receipt, {
    layoutProfileId: "legacy-v1",
  });
}
