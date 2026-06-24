/**
 * THERMAL-PRINTING-13I.6 — diagnostic receipt content (visually distinct from order tickets).
 */
import type { AgentJobTicketPayload } from "../../shared/printing/agentJobMessages";
import { diagnosticOrderIdForWireJob } from "../../shared/printing/diagnosticPrint";

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
    orderId,
    restaurantId: input.restaurantId,
    items: lines.map((line) => ({
      // Agent rejects whitespace-only itemName; zero-width space renders as blank line.
      itemName: line.length > 0 ? line : "\u200B",
      quantity: 1,
      notes: null,
    })),
  };
}
