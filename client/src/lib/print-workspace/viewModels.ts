import type { RouterOutputs } from "@/lib/trpc";

export type PrintWorkspaceListResult = RouterOutputs["printWorkspace"]["read"]["listOrders"];
export type PrintWorkspaceOrderRow = PrintWorkspaceListResult["items"][number];
export type PrintWorkspaceOrderDetail = RouterOutputs["printWorkspace"]["read"]["getOrderDetail"];

export type PrintWorkspaceViewFilter = "awaiting" | "completed" | "all";

export type PrintWorkspaceOrderCardModel = {
  orderId: number;
  orderNumber: string;
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
    status: order.status,
    statusLabel: formatStatusLabel(order.status, language),
    tableLabel: isAr ? `طاولة ${order.tableNumber}` : `Table ${order.tableNumber}`,
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
