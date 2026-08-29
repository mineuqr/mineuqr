/**
 * ORDER-CARD-OPERATIONAL-PRINT-WINDOWS-1
 * Operational Order Ticket projection for Windows Print Preview.
 * Not Invoice, Settlement Receipt, or connector/RLC dispatch.
 */

import { formatLocaleDateTime } from "@/lib/numericPresentation";
import { formatProjectedFulfilmentLabel } from "@/lib/order-presentation/formatProjectedFulfilment";
import { operationalDisplayReference } from "@/lib/operational-workspace/orderDisplayIdentity";
import {
  ORDERING_CHANNEL_CASHIER_POS,
  ORDERING_CHANNEL_KIOSK,
  ORDERING_CHANNEL_QR,
  ORDERING_CHANNEL_TABLE_SESSION,
  ORDERING_CHANNEL_WAITER_TABLET,
} from "@shared/ordering-platform/orderingChannelRegistry";

export type OperationalOrderTicketLang = "ar" | "en";

export const OPERATIONAL_ORDER_TICKET_PRINT_ROOT_ID =
  "operational-order-ticket-print" as const;

/**
 * ORDER-CARD-PRINT-ONE-PAGE-LAYOUT-FIX-1 —
 * Body class scopes @media print isolation to the operational ticket.
 * Does not affect Cashier, Settlement, or shift-closing print surfaces.
 */
export const OPERATIONAL_ORDER_TICKET_PRINT_BODY_CLASS =
  "printing-operational-order-ticket" as const;

const SOURCE_LABELS = {
  counter: { ar: "الكاشير", en: "Counter" },
  table_order: { ar: "طلب طاولة", en: "Table Order" },
  waiter_order: { ar: "طلب ويتر", en: "Waiter Order" },
  self_order: { ar: "طلب ذاتي", en: "Self-Order" },
} as const;

export const OPERATIONAL_ORDER_TICKET_COPY = {
  title: { ar: "تذكرة الطلب", en: "Order Ticket" },
  orderNumber: { ar: "رقم الطلب", en: "Order number" },
  channelOrTable: { ar: "الطاولة / القناة", en: "Table / channel" },
  orderTime: { ar: "وقت الطلب", en: "Order time" },
  items: { ar: "الأصناف", en: "Items" },
  print: { ar: "طباعة", en: "Print" },
  close: { ar: "إغلاق", en: "Close" },
  unavailable: {
    ar: "الطلب غير متاح للطباعة",
    en: "Order is not available to print",
  },
  previewFailed: {
    ar: "تعذّر فتح معاينة الطباعة",
    en: "Print preview could not open",
  },
} as const;

export type OperationalOrderTicketLineSource = Readonly<{
  nameAr: string;
  nameEn?: string | null;
  quantity: number;
}>;

export type OperationalOrderTicketSource = Readonly<{
  orderNumber?: string | null;
  displayReference?: string | null;
  identityScope?: string | null;
  businessDay?: string | null;
  dailyDisplayNumber?: number | null;
  fulfilmentAnchorType?: string | null;
  serviceMode?: string | null;
  orderingChannel?: string | null;
  tableNumber?: number | null;
  fulfilmentLabel?: string | null;
  createdAt: string;
  lineItems: readonly OperationalOrderTicketLineSource[];
}>;

export type OperationalOrderTicketItem = Readonly<{
  name: string;
  quantity: number;
  lineLabel: string;
}>;

export type OperationalOrderTicketViewModel = Readonly<{
  orderReference: string;
  sourceLabel: string;
  tableOrChannelLabel: string;
  orderTimeLabel: string;
  orderTimeSource: string;
  items: readonly OperationalOrderTicketItem[];
}>;

export function operationalOrderTicketUiLabel(
  key: keyof typeof OPERATIONAL_ORDER_TICKET_COPY,
  language: string
): string {
  const lang: OperationalOrderTicketLang = language.startsWith("ar") ? "ar" : "en";
  return OPERATIONAL_ORDER_TICKET_COPY[key][lang];
}

/**
 * Existing product source labels (Counter / Table Order / Waiter Order / Self-Order).
 * Maps OrderingChannelId only — does not invent a channel taxonomy.
 */
export function operationalTicketSourceLabel(
  orderingChannel: string | null | undefined,
  language: string
): string {
  const lang: OperationalOrderTicketLang = language.startsWith("ar") ? "ar" : "en";
  const channel = orderingChannel?.trim() ?? "";
  if (channel === ORDERING_CHANNEL_CASHIER_POS) return SOURCE_LABELS.counter[lang];
  if (channel === ORDERING_CHANNEL_QR || channel === ORDERING_CHANNEL_TABLE_SESSION) {
    return SOURCE_LABELS.table_order[lang];
  }
  if (channel === ORDERING_CHANNEL_WAITER_TABLET) return SOURCE_LABELS.waiter_order[lang];
  if (channel === ORDERING_CHANNEL_KIOSK) return SOURCE_LABELS.self_order[lang];
  return "";
}

function itemName(
  line: OperationalOrderTicketLineSource,
  language: string
): string {
  const isAr = language.startsWith("ar");
  return isAr
    ? line.nameAr?.trim() || line.nameEn?.trim() || ""
    : line.nameEn?.trim() || line.nameAr?.trim() || "";
}

function formatOrderTime(createdAt: string, language: string): string {
  const locale = language.startsWith("ar") ? "ar-SA" : "en-US";
  const formatted = formatLocaleDateTime(createdAt, locale, {
    dateStyle: "short",
    timeStyle: "short",
  });
  return formatted || createdAt;
}

export function toOperationalOrderTicketViewModel(
  source: OperationalOrderTicketSource,
  language: string,
  tableUnit: "table" | "room" = "table"
): OperationalOrderTicketViewModel {
  const isAr = language.startsWith("ar");
  const orderReference = operationalDisplayReference({
    orderNumber: source.orderNumber ?? source.displayReference ?? "",
    businessDay: source.businessDay ?? null,
    dailyDisplayNumber: source.dailyDisplayNumber ?? null,
    displayReference: source.displayReference ?? undefined,
    identityScope: source.identityScope ?? null,
    fulfilmentAnchorType: source.fulfilmentAnchorType ?? null,
    serviceMode: source.serviceMode ?? null,
  });
  const sourceLabel = operationalTicketSourceLabel(source.orderingChannel, language);
  const fulfilment = formatProjectedFulfilmentLabel(
    {
      serviceMode: source.serviceMode ?? "",
      fulfilmentAnchorType: source.fulfilmentAnchorType ?? "",
      fulfilmentLabel: source.fulfilmentLabel ?? "",
    },
    { isAr, tableUnit }
  );
  const tableOrChannelLabel =
    sourceLabel && fulfilment && sourceLabel !== fulfilment
      ? `${sourceLabel} · ${fulfilment}`
      : sourceLabel || fulfilment;

  return {
    orderReference,
    sourceLabel,
    tableOrChannelLabel,
    orderTimeLabel: formatOrderTime(source.createdAt, language),
    orderTimeSource: source.createdAt,
    items: source.lineItems.map((line) => {
      const name = itemName(line, language);
      return {
        name,
        quantity: line.quantity,
        lineLabel: `${name} × ${line.quantity}`,
      };
    }),
  };
}

/**
 * Same window.print() path as Cashier/Settlement/Drawer.
 * Isolation body class matches Drawer: display:none on the app shell so
 * min-height:100% #root cannot produce a blank first page.
 */
export function printOperationalOrderTicket(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const body = document.body;
  body.classList.add(OPERATIONAL_ORDER_TICKET_PRINT_BODY_CLASS);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    body.classList.remove(OPERATIONAL_ORDER_TICKET_PRINT_BODY_CLASS);
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  window.print();
  window.setTimeout(cleanup, 2_000);
}
