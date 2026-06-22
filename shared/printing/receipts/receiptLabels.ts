/**
 * THERMAL-PRINTING-13B — locale-aware receipt labels (foundation).
 *
 * English strings are authoritative for production output in 13B.
 * Arabic label slots exist for future localization without pipeline changes.
 */
import { PRINT_TICKET_LOCALE, type PrintTicketLocale } from "../types";

export type ReceiptLabels = {
  kitchenOrderTitle: string;
  orderNumber: string;
  tableNumber: string;
  sessionId: string;
  createdTime: string;
  orderNotes: string;
  itemNotePrefix: string;
  subtotal: string;
  total: string;
};

const EN_LABELS: ReceiptLabels = {
  kitchenOrderTitle: "Kitchen Order",
  orderNumber: "Order Number",
  tableNumber: "Table Number",
  sessionId: "Session Id",
  createdTime: "Created Time",
  orderNotes: "Order Notes:",
  itemNotePrefix: "*",
  subtotal: "Subtotal",
  total: "Total",
};

const AR_LABELS: ReceiptLabels = {
  kitchenOrderTitle: "طلب مطبخ",
  orderNumber: "رقم الطلب",
  tableNumber: "رقم الطاولة",
  sessionId: "رقم الجلسة",
  createdTime: "وقت الإنشاء",
  orderNotes: "ملاحظات الطلب:",
  itemNotePrefix: "*",
  subtotal: "المجموع الفرعي",
  total: "الإجمالي",
};

const BILINGUAL_LABELS: ReceiptLabels = {
  ...EN_LABELS,
  kitchenOrderTitle: "Kitchen Order / طلب مطبخ",
  subtotal: "Subtotal / المجموع الفرعي",
  total: "Total / الإجمالي",
};

export function getReceiptLabels(locale: PrintTicketLocale): ReceiptLabels {
  switch (locale) {
    case PRINT_TICKET_LOCALE.AR:
      return AR_LABELS;
    case PRINT_TICKET_LOCALE.BILINGUAL:
      return BILINGUAL_LABELS;
    case PRINT_TICKET_LOCALE.EN:
    default:
      return EN_LABELS;
  }
}
