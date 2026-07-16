import type { RouterOutputs } from "@/lib/trpc";
import { formatLocaleDateTime } from "@/lib/numericPresentation";
import { formatProjectedFulfilmentLabel } from "@/lib/order-presentation/formatProjectedFulfilment";
import { operationalDisplayReference } from "@/lib/operational-workspace/orderDisplayIdentity";

export type PrintWorkspaceListResult = RouterOutputs["printWorkspace"]["read"]["listOrders"];
export type PrintWorkspaceOrderRow = PrintWorkspaceListResult["items"][number];
export type PrintWorkspaceOrderDetail = RouterOutputs["printWorkspace"]["read"]["getOrderDetail"];

export type PrintWorkspaceViewFilter = "awaiting" | "completed" | "all";

export type PrintWorkspaceOrderCardModel = {
  orderId: number;
  orderNumber: string;
  displayReference: string;
  status: string;
  statusLabel: string;
  tableLabel: string;
  customerLabel: string;
  totalAmount: string;
  createdAt: string;
  itemCount: number;
  notesPreview: string | null;
  isAwaitingPrint: boolean;
};

export function toPrintWorkspaceOrderCard(
  order: PrintWorkspaceOrderRow,
  language: string
): PrintWorkspaceOrderCardModel {
  const isAr = language === "ar";
  const itemCount = order.lineItems.reduce((sum, li) => sum + li.quantity, 0);
  const customer =
    order.customerName?.trim() ||
    order.customerPhone?.trim() ||
    (isAr ? "—" : "—");

  return {
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    displayReference: operationalDisplayReference(order),
    status: order.status,
    statusLabel: formatStatusLabel(order.status, language),
    tableLabel: formatProjectedFulfilmentLabel(
      {
        serviceMode: order.serviceMode,
        fulfilmentAnchorType: order.fulfilmentAnchorType,
        fulfilmentLabel: order.fulfilmentLabel,
      },
      { isAr, tableUnit: "table" }
    ),
    customerLabel: customer,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt,
    itemCount,
    notesPreview: order.notes?.trim() ? order.notes.trim() : null,
    isAwaitingPrint: order.isActive,
  };
}

export function formatStatusLabel(status: string, language: string): string {
  const isAr = language === "ar";
  const map: Record<string, { en: string; ar: string }> = {
    pending: { en: "Pending", ar: "قيد الانتظار" },
    preparing: { en: "Preparing", ar: "قيد التحضير" },
    ready: { en: "Ready", ar: "جاهز" },
    served: { en: "Completed", ar: "مكتمل" },
    cancelled: { en: "Cancelled", ar: "ملغي" },
  };
  const entry = map[status];
  if (!entry) return status;
  return isAr ? entry.ar : entry.en;
}

export type WorkspaceHealthState =
  RouterOutputs["printWorkspace"]["read"]["getLocalConnectorStatus"]["connectionStatus"];

const HEALTH_LABELS: Record<
  WorkspaceHealthState,
  { en: string; ar: string; tone: "ok" | "warn" | "bad" | "muted" }
> = {
  healthy: { en: "Healthy", ar: "سليم", tone: "ok" },
  connected: { en: "Connected", ar: "متصل", tone: "ok" },
  warning: { en: "Warning", ar: "تحذير", tone: "warn" },
  degraded: { en: "Degraded", ar: "متدهور", tone: "warn" },
  disconnected: { en: "Disconnected", ar: "غير متصل", tone: "bad" },
  offline: { en: "Offline", ar: "غير متصل", tone: "bad" },
  unregistered: { en: "Not registered", ar: "غير مسجل", tone: "muted" },
};

export function formatHealthLabel(state: WorkspaceHealthState, language: string): string {
  const entry = HEALTH_LABELS[state];
  return language === "ar" ? entry.ar : entry.en;
}

export function healthTone(state: WorkspaceHealthState): "ok" | "warn" | "bad" | "muted" {
  return HEALTH_LABELS[state].tone;
}

export function formatUptime(ms: number | null, language: string): string {
  if (ms == null || ms < 0) return language === "ar" ? "—" : "—";
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return language === "ar" ? `${hours}س ${minutes}د` : `${hours}h ${minutes}m`;
  }
  return language === "ar" ? `${minutes} دقيقة` : `${minutes}m`;
}

export function formatTimestamp(value: string | null, language: string): string {
  if (!value) return language === "ar" ? "—" : "—";
  try {
    return formatLocaleDateTime(value, language === "ar" ? "ar-SA" : "en-US", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

export function connectorReadyForPrint(
  connectionStatus: WorkspaceHealthState | undefined
): boolean {
  return connectionStatus === "healthy" || connectionStatus === "connected";
}

