/**
 * PRINTING-RENDERING-1A — canonical TicketDocument model (platform-neutral).
 *
 * TicketDocument is the authoritative rendering input. It must not depend on
 * ESC/POS, transport, execution platform, or device capabilities.
 */
import type { PaperWidthMm, PrintTicketLocale } from "../types";
import type { LayoutDirection, TextDirection } from "../receipts/receiptLocale";

export const TICKET_DOCUMENT_SCHEMA_VERSION = 1 as const;

export type TicketDocumentSchemaVersion = typeof TICKET_DOCUMENT_SCHEMA_VERSION;

export const TICKET_DOCUMENT_KIND = {
  KITCHEN_ORDER: "kitchen-order",
  DIAGNOSTIC: "diagnostic",
  CUSTOMER_RECEIPT: "customer-receipt",
} as const;

export type TicketDocumentKind =
  (typeof TICKET_DOCUMENT_KIND)[keyof typeof TICKET_DOCUMENT_KIND];

export type TicketExecutionMetadata = {
  stationId: number | null;
  stationName: string | null;
};

export type TicketDocumentIdentity = {
  /** Primary printable identity — order number (not "Kitchen Order"). */
  orderNumber: string;
  orderId: number;
};

export type TicketDocumentFooter = {
  feedLines: number;
  cut: boolean;
};

export type TicketRenderHints = {
  paperWidthMm?: PaperWidthMm;
};

/**
 * Platform-neutral printable document consumed by the rendering pipeline.
 */
export type TicketDocument = {
  schemaVersion: TicketDocumentSchemaVersion;
  kind: TicketDocumentKind;
  locale: PrintTicketLocale;
  layoutDirection: LayoutDirection;
  defaultTextDirection: TextDirection;
  restaurantId: number;
  identity: TicketDocumentIdentity;
  execution: TicketExecutionMetadata;
  blocks: TicketBlock[];
  footer: TicketDocumentFooter;
  renderHints?: TicketRenderHints;
};
