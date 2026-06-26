/**
 * THERMAL-PRINTING-13I.6 / PRINTING-RENDERING-1A — diagnostic receipt content.
 */
import type { AgentJobTicketPayload } from "../../shared/printing/agentJobMessages";
import { diagnosticOrderIdForWireJob } from "../../shared/printing/diagnosticPrint";
import { AGENT_TICKET_PAYLOAD_VERSION } from "../../shared/printing/agentJobMessages";
import { TICKET_DOCUMENT_KIND } from "../../shared/printing/tickets/ticketTypes";

export function buildDiagnosticTicketPayload(input: {
  wireJobId: number;
  restaurantId: number;
  printerName: string;
  agentId: string;
  diagnosticId: string;
  triggeredBy: string;
  triggeredAt: string;
}): AgentJobTicketPayload {
  const orderId = diagnosticOrderIdForWireJob(input.wireJobId);
  const lines = [
    "================================",
    "   MINEUQR DIAGNOSTIC TEST",
    "================================",
    "",
    `Printer: ${input.printerName}`,
    `Agent: ${input.agentId}`,
    "",
    `Diagnostic ID: ${input.diagnosticId}`,
    `Triggered By: ${input.triggeredBy}`,
    `Triggered At: ${input.triggeredAt}`,
    "",
    "*** NOT A CUSTOMER ORDER ***",
    "================================",
  ];

  return {
    payloadVersion: AGENT_TICKET_PAYLOAD_VERSION.CANONICAL,
    documentKind: TICKET_DOCUMENT_KIND.DIAGNOSTIC,
    orderId,
    restaurantId: input.restaurantId,
    orderNumber: String(orderId),
    createdAt: input.triggeredAt,
    items: lines.map((line) => ({
      itemName: line.length > 0 ? line : "\u200B",
      quantity: 1,
      notes: null,
    })),
  };
}
