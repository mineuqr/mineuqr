/**
 * THERMAL-PRINTING-13B — receipt adapters (domain → canonical Receipt).
 */
import { PRINT_TICKET_LOCALE } from "../types";
import type { AgentJobTicketPayload } from "../agentJobMessages";
import { resolveReceiptDirectionProfile } from "./receiptLocale";
import {
  RECEIPT_KIND,
  type Receipt,
  type ReceiptItem,
} from "./receiptTypes";

export type KitchenTicketAdapterInput = {
  ticketType: string;
  restaurantId: number;
  orderId: number;
  orderNumber: string;
  tableNumber: string | null;
  sessionId: number | null;
  createdAt: Date;
  notes: string | null;
  items: Array<{
    itemName: string;
    quantity: number;
    notes: string | null;
  }>;
};

export type ReceiptAdapterOptions = {
  locale?: Receipt["locale"];
  paperWidthMm?: Receipt["paperWidthMm"];
};

function mapItems(
  items: Array<{ itemName: string; quantity: number; notes?: string | null }>
): ReceiptItem[] {
  return items.map((item) => ({
    quantity: item.quantity,
    name: item.itemName,
    notes: item.notes ?? null,
  }));
}

export function receiptFromKitchenTicket(
  ticket: KitchenTicketAdapterInput,
  options: ReceiptAdapterOptions = {}
): Receipt {
  const locale = options.locale ?? PRINT_TICKET_LOCALE.EN;
  const directions = resolveReceiptDirectionProfile(locale);

  return {
    kind: RECEIPT_KIND.KITCHEN_ORDER,
    locale,
    paperWidthMm: options.paperWidthMm,
    layoutDirection: directions.layoutDirection,
    defaultTextDirection: directions.defaultTextDirection,
    restaurantId: ticket.restaurantId,
    orderId: ticket.orderId,
    header: { title: "" },
    metadata: {
      orderNumber: ticket.orderNumber,
      tableNumber: ticket.tableNumber,
      sessionId: ticket.sessionId,
      createdAt: ticket.createdAt,
    },
    items: mapItems(ticket.items),
    notes: ticket.notes ? { orderNotes: ticket.notes } : undefined,
    footer: { feedLines: 3, cut: true },
  };
}

export function receiptFromAgentJobTicket(
  ticket: AgentJobTicketPayload,
  options: ReceiptAdapterOptions & { createdAt?: Date } = {}
): Receipt {
  const locale = options.locale ?? PRINT_TICKET_LOCALE.EN;
  const directions = resolveReceiptDirectionProfile(locale);
  const createdAt = options.createdAt ?? new Date(0);

  return {
    kind: RECEIPT_KIND.KITCHEN_ORDER,
    locale,
    paperWidthMm: options.paperWidthMm,
    layoutDirection: directions.layoutDirection,
    defaultTextDirection: directions.defaultTextDirection,
    restaurantId: ticket.restaurantId,
    orderId: ticket.orderId,
    header: { title: "" },
    metadata: {
      orderNumber: String(ticket.orderId),
      createdAt,
    },
    items: mapItems(ticket.items),
    footer: { feedLines: 3, cut: true },
  };
}
