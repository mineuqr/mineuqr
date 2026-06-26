/**
 * PRINTING-RENDERING-1A — server order ticket builder (Order → TicketDocument).
 *
 * Business mapping only. Delegates canonical structure to shared ticket builder.
 */
import type { KitchenTicket } from "./ticketTypes";
import { buildKitchenOrderTicketDocument } from "../../shared/printing/tickets/ticketBuilder";
import { ticketDocumentToAgentPayload } from "../../shared/printing/tickets/ticketPayload";
import type { TicketDocument } from "../../shared/printing/tickets/ticketTypes";
import type { AgentJobTicketPayload } from "../../shared/printing/agentJobMessages";

export type BuildOrderTicketDocumentInput = {
  kitchenTicket: KitchenTicket;
  stationId: number | null;
  stationName: string | null;
};

export function buildOrderTicketDocument(input: BuildOrderTicketDocumentInput): TicketDocument {
  const ticket = input.kitchenTicket;
  const createdAt =
    ticket.createdAt instanceof Date && !Number.isNaN(ticket.createdAt.getTime())
      ? ticket.createdAt
      : new Date(0);

  return buildKitchenOrderTicketDocument({
    restaurantId: ticket.restaurantId,
    orderId: ticket.orderId,
    orderNumber: ticket.orderNumber ?? String(ticket.orderId),
    tableNumber: ticket.tableNumber ?? null,
    sessionId: ticket.sessionId ?? null,
    createdAt,
    orderNotes: ticket.notes ?? null,
    items: ticket.items.map((item) => ({
      itemName: item.itemName,
      quantity: item.quantity,
      notes: item.notes,
    })),
    execution: {
      stationId: input.stationId,
      stationName: input.stationName,
    },
  });
}

export function buildOrderAgentTicketPayload(input: BuildOrderTicketDocumentInput): AgentJobTicketPayload {
  const document = buildOrderTicketDocument(input);
  return ticketDocumentToAgentPayload(document);
}
