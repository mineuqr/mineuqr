/**
 * THERMAL-PRINTING-13B — canonical receipt domain model (platform-neutral).
 *
 * Receipt is the single authoritative representation before layout and ESC/POS.
 * It must not depend on transport, executor, or byte-encoding concerns.
 */
import type { PaperWidthMm } from "../types";
import type { LayoutDirection, ReceiptLocale, TextDirection } from "./receiptLocale";

export const RECEIPT_KIND = {
  KITCHEN_ORDER: "kitchen-order",
} as const;

export type ReceiptKind = (typeof RECEIPT_KIND)[keyof typeof RECEIPT_KIND];

export type ReceiptHeader = {
  title: string;
};

export type ReceiptMetadata = {
  /** Display value for the order-number line (may be order id or formatted number). */
  orderNumber: string;
  tableNumber?: string | null;
  sessionId?: number | null;
  createdAt: Date;
};

export type ReceiptItem = {
  quantity: number;
  name: string;
  notes?: string | null;
  unitPrice?: string | null;
};

export type ReceiptTotals = {
  subtotal?: string | null;
  total?: string | null;
  currency?: string | null;
};

export type ReceiptNotes = {
  orderNotes?: string | null;
};

export type ReceiptFooter = {
  feedLines: number;
  cut: boolean;
};

/**
 * Platform-neutral receipt consumed by the layout engine and render pipeline.
 */
export type Receipt = {
  kind: ReceiptKind;
  locale: ReceiptLocale;
  /** Resolved from printer profile; omitted when unknown (legacy layout fallback). */
  paperWidthMm?: PaperWidthMm;
  layoutDirection: LayoutDirection;
  defaultTextDirection: TextDirection;
  restaurantId: number;
  orderId: number;
  header: ReceiptHeader;
  metadata: ReceiptMetadata;
  items: ReceiptItem[];
  totals?: ReceiptTotals;
  notes?: ReceiptNotes;
  footer: ReceiptFooter;
};
