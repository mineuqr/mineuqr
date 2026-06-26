/**
 * THERMAL-PRINTING-10A / 13B / 13C / 13D / PRINTING-RENDERING-1A — ESC/POS payload generation.
 *
 * Routes through the canonical TicketDocument rendering pipeline and legacy adapter.
 */
import type { AgentJobTicketPayload } from "./agentJobMessages";
import type { EscPosPayload } from "./executionExecutor";
import type { ArabicRenderingMode } from "./arabic/arabicRenderingMode";
import type { PaperWidthMm, PrintTicketLocale } from "./types";
import { renderAgentTicketPayloadToEscPosPayload } from "./tickets/ticketRenderingPipeline";

export function buildEscPosPayloadFromAgentTicket(input: {
  ticket: AgentJobTicketPayload;
  createdAt?: Date;
  paperWidthMm?: PaperWidthMm;
  arabicRenderingMode?: ArabicRenderingMode;
  locale?: PrintTicketLocale;
}): EscPosPayload {
  return renderAgentTicketPayloadToEscPosPayload(input);
}
