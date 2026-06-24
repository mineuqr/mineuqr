/**
 * THERMAL-PRINTING-13I.6 — diagnostic receipt content (visually distinct from order tickets).
 */
import type { AgentJobTicketPayload } from "../../shared/printing/agentJobMessages";

export function buildDiagnosticTicketPayload(input: {
  restaurantId: number;
  printerName: string;
  agentId: string;
  diagnosticId: string;
  triggeredBy: string;
  triggeredAt: string;
}): AgentJobTicketPayload {
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
    orderId: 0,
    restaurantId: input.restaurantId,
    items: lines.map((line) => ({
      itemName: line.length > 0 ? line : " ",
      quantity: 1,
      notes: null,
    })),
  };
}
