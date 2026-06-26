/**
 * PRINTING-RENDERING-1A — Agent wire payload → TicketDocument (backward compatible).
 */
import type { AgentJobTicketPayload } from "../agentJobMessages";
import { PRINT_TICKET_LOCALE } from "../types";
import { resolveReceiptDirectionProfile } from "../receipts/receiptLocale";
import { buildDiagnosticTicketDocument, buildKitchenOrderTicketDocument } from "./ticketBuilder";
import {
  AGENT_TICKET_PAYLOAD_VERSION,
  isCanonicalAgentTicketPayload,
  resolveDocumentKindFromPayload,
} from "./ticketPayload";
import { TICKET_DOCUMENT_KIND, TICKET_DOCUMENT_SCHEMA_VERSION, type TicketDocument } from "./ticketTypes";

export type TicketDocumentFromPayloadOptions = {
  locale?: TicketDocument["locale"];
  createdAt?: Date;
};

function parseCreatedAt(value: string | undefined, fallback: Date): Date {
  if (!value) {
    return fallback;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export function ticketDocumentFromAgentPayload(
  ticket: AgentJobTicketPayload,
  options: TicketDocumentFromPayloadOptions = {}
): TicketDocument {
  const documentKind = resolveDocumentKindFromPayload(ticket);
  const locale = options.locale ?? PRINT_TICKET_LOCALE.EN;
  const fallbackCreatedAt = options.createdAt ?? new Date(0);

  if (documentKind === TICKET_DOCUMENT_KIND.DIAGNOSTIC) {
    return buildDiagnosticTicketDocument({
      restaurantId: ticket.restaurantId,
      orderId: ticket.orderId,
      lines: ticket.items.map((item) => item.itemName),
    });
  }

  if (isCanonicalAgentTicketPayload(ticket)) {
    return buildKitchenOrderTicketDocument({
      restaurantId: ticket.restaurantId,
      orderId: ticket.orderId,
      orderNumber: ticket.orderNumber ?? String(ticket.orderId),
      tableNumber: ticket.tableNumber ?? null,
      sessionId: ticket.sessionId ?? null,
      createdAt: parseCreatedAt(ticket.createdAt, fallbackCreatedAt),
      orderNotes: ticket.orderNotes ?? null,
      items: ticket.items.map((item) => ({
        itemName: item.itemName,
        quantity: item.quantity,
        notes: item.notes ?? null,
      })),
      execution: {
        stationId: ticket.stationId ?? null,
        stationName: ticket.stationName ?? null,
      },
      locale,
      kind: TICKET_DOCUMENT_KIND.KITCHEN_ORDER,
    });
  }

  const legacyOrderNumber = String(ticket.orderId);

  return buildKitchenOrderTicketDocument({
    restaurantId: ticket.restaurantId,
    orderId: ticket.orderId,
    orderNumber: legacyOrderNumber,
    tableNumber: null,
    sessionId: null,
    createdAt: fallbackCreatedAt,
    orderNotes: null,
    items: ticket.items.map((item) => ({
      itemName: item.itemName,
      quantity: item.quantity,
      notes: item.notes ?? null,
    })),
    execution: {
      stationId: null,
      stationName: null,
    },
    locale,
    kind: TICKET_DOCUMENT_KIND.KITCHEN_ORDER,
  });
}

/**
 * Reconstructs a TicketDocument from a legacy v1 payload using only wire fields.
 * Preserves backward compatibility for agents that have not upgraded.
 */
export function isLegacyAgentTicketPayload(ticket: AgentJobTicketPayload): boolean {
  return (
    ticket.payloadVersion == null ||
    ticket.payloadVersion === AGENT_TICKET_PAYLOAD_VERSION.LEGACY
  );
}

export function ticketDocumentIdentityFromPayload(ticket: AgentJobTicketPayload): {
  orderNumber: string;
  orderId: number;
} {
  if (isCanonicalAgentTicketPayload(ticket)) {
    return {
      orderNumber: ticket.orderNumber,
      orderId: ticket.orderId,
    };
  }

  return {
    orderNumber: String(ticket.orderId),
    orderId: ticket.orderId,
  };
}

export function ensureTicketDocumentSchema(document: TicketDocument): TicketDocument {
  if (document.schemaVersion === TICKET_DOCUMENT_SCHEMA_VERSION) {
    return document;
  }

  const directions = resolveReceiptDirectionProfile(document.locale);
  return {
    ...document,
    schemaVersion: TICKET_DOCUMENT_SCHEMA_VERSION,
    layoutDirection: document.layoutDirection ?? directions.layoutDirection,
    defaultTextDirection: document.defaultTextDirection ?? directions.defaultTextDirection,
  };
}
