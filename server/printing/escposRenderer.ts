/**
 * THERMAL-PRINTING-4B — ESC/POS kitchen ticket renderer (document only, no I/O).
 */
import type { EscPosCommand, EscPosDocument } from "./escposTypes";
import type { KitchenTicket } from "./ticketTypes";

function formatTicketCreatedAt(createdAt: Date): string {
  return createdAt.toISOString();
}

function appendHeader(commands: EscPosCommand[], ticket: KitchenTicket): void {
  commands.push({ type: "initialize" });
  commands.push({ type: "align", value: "center" });
  commands.push({ type: "text", value: "Kitchen Order" });
  commands.push({ type: "align", value: "left" });
  commands.push({ type: "text", value: `Order Number: ${ticket.orderNumber}` });

  if (ticket.tableNumber != null) {
    commands.push({ type: "text", value: `Table Number: ${ticket.tableNumber}` });
  }

  if (ticket.sessionId != null) {
    commands.push({ type: "text", value: `Session Id: ${ticket.sessionId}` });
  }

  commands.push({
    type: "text",
    value: `Created Time: ${formatTicketCreatedAt(ticket.createdAt)}`,
  });
}

function appendItems(commands: EscPosCommand[], ticket: KitchenTicket): void {
  commands.push({ type: "separator" });

  for (const item of ticket.items) {
    commands.push({ type: "text", value: `${item.quantity}x ${item.itemName}` });
    if (item.notes) {
      commands.push({ type: "text", value: `* ${item.notes}` });
    }
  }
}

function appendOrderNotes(commands: EscPosCommand[], ticket: KitchenTicket): void {
  if (!ticket.notes) {
    return;
  }

  commands.push({ type: "separator" });
  commands.push({ type: "text", value: "Order Notes:" });
  commands.push({ type: "text", value: ticket.notes });
}

function appendFooter(commands: EscPosCommand[]): void {
  commands.push({ type: "separator" });
  commands.push({ type: "feed", lines: 3 });
  commands.push({ type: "cut" });
}

export function renderEscPosKitchenTicket(ticket: KitchenTicket): EscPosDocument {
  const commands: EscPosCommand[] = [];

  appendHeader(commands, ticket);
  appendItems(commands, ticket);
  appendOrderNotes(commands, ticket);
  appendFooter(commands);

  return { commands };
}
