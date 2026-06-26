/**
 * PRINTING-RENDERING-1A — locale-aware ticket metadata labels.
 */
import { PRINT_TICKET_LOCALE, type PrintTicketLocale } from "../types";

export type TicketMetadataLabels = {
  tableNumber: string;
  sessionId: string;
  createdTime: string;
  station: string;
  orderNotes: string;
  subtotal: string;
  total: string;
};

const EN_LABELS: TicketMetadataLabels = {
  tableNumber: "Table Number",
  sessionId: "Session Id",
  createdTime: "Created Time",
  station: "Station",
  orderNotes: "Order Notes:",
  subtotal: "Subtotal",
  total: "Total",
};

const AR_LABELS: TicketMetadataLabels = {
  tableNumber: "رقم الطاولة",
  sessionId: "رقم الجلسة",
  createdTime: "وقت الإنشاء",
  station: "المحطة",
  orderNotes: "ملاحظات الطلب:",
  subtotal: "المجموع الفرعي",
  total: "الإجمالي",
};

export function getTicketMetadataLabels(locale: PrintTicketLocale): TicketMetadataLabels {
  if (locale === PRINT_TICKET_LOCALE.AR) {
    return AR_LABELS;
  }
  return EN_LABELS;
}
