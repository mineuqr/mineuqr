/**
 * PRINTING-RENDERING-1A — agent ticket wire contract (versioned, backward compatible).
 */
import type { AgentJobTicketPayload, AgentTicketPayloadVersion } from "../agentJobMessages";
import { AGENT_TICKET_PAYLOAD_VERSION } from "../agentJobMessages";
import { TICKET_DOCUMENT_KIND, type TicketDocument, type TicketDocumentKind } from "./ticketTypes";
import { isTicketItemBlock } from "./ticketBlocks";
import type { TicketBlock } from "./ticketBlocks";

export { AGENT_TICKET_PAYLOAD_VERSION, type AgentTicketPayloadVersion } from "../agentJobMessages";

export function isCanonicalAgentTicketPayload(
  ticket: AgentJobTicketPayload
): ticket is AgentJobTicketPayload & {
  payloadVersion: typeof AGENT_TICKET_PAYLOAD_VERSION.CANONICAL;
  orderNumber: string;
} {
  return ticket.payloadVersion === AGENT_TICKET_PAYLOAD_VERSION.CANONICAL;
}

export function resolveAgentTicketPayloadVersion(
  ticket: AgentJobTicketPayload
): AgentTicketPayloadVersion {
  if (ticket.payloadVersion === AGENT_TICKET_PAYLOAD_VERSION.CANONICAL) {
    return AGENT_TICKET_PAYLOAD_VERSION.CANONICAL;
  }
  return AGENT_TICKET_PAYLOAD_VERSION.LEGACY;
}

export function ticketDocumentToAgentPayload(document: TicketDocument): AgentJobTicketPayload {
  const items = collectItemBlocks(document.blocks);
  const createdAtField = findMetadataValue(document.blocks, "createdAt");

  return {
    payloadVersion: AGENT_TICKET_PAYLOAD_VERSION.CANONICAL,
    orderId: document.identity.orderId,
    restaurantId: document.restaurantId,
    documentKind: document.kind,
    orderNumber: document.identity.orderNumber,
    tableNumber: findMetadataValue(document.blocks, "tableNumber") ?? null,
    sessionId: parseOptionalInt(findMetadataValue(document.blocks, "sessionId")),
    createdAt: createdAtField ?? new Date(0).toISOString(),
    orderNotes: findOrderNoteText(document.blocks),
    stationId: document.execution.stationId,
    stationName: document.execution.stationName,
    items: items.map((item) => ({
      itemName: item.name,
      quantity: item.quantity,
      notes: item.notes ?? null,
    })),
  };
}

function collectItemBlocks(blocks: TicketBlock[]): Array<{
  quantity: number;
  name: string;
  notes: string | null;
}> {
  const items: Array<{ quantity: number; name: string; notes: string | null }> = [];

  for (const block of blocks) {
    if (isTicketItemBlock(block)) {
      items.push({
        quantity: block.quantity,
        name: block.name,
        notes: block.notes ?? null,
      });
    }
    if (block.kind === "section") {
      items.push(...collectItemBlocks(block.blocks));
    }
  }

  return items;
}

function findMetadataValue(blocks: TicketBlock[], key: string): string | undefined {
  for (const block of blocks) {
    if (block.kind === "metadata") {
      const field = block.fields.find((entry) => entry.key === key);
      if (field) {
        return field.value;
      }
    }
    if (block.kind === "section") {
      const nested = findMetadataValue(block.blocks, key);
      if (nested) {
        return nested;
      }
    }
  }
  return undefined;
}

function findOrderNoteText(blocks: TicketBlock[]): string | null {
  for (const block of blocks) {
    if (block.kind === "note" && block.scope === "order") {
      return block.text;
    }
    if (block.kind === "section") {
      const nested = findOrderNoteText(block.blocks);
      if (nested) {
        return nested;
      }
    }
  }
  return null;
}

function parseOptionalInt(value: string | undefined): number | null {
  if (value == null || value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

export function resolveDocumentKindFromPayload(
  ticket: AgentJobTicketPayload
): TicketDocumentKind {
  if (ticket.documentKind) {
    return ticket.documentKind;
  }
  return TICKET_DOCUMENT_KIND.KITCHEN_ORDER;
}
