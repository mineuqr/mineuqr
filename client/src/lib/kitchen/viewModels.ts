import type { KitchenTicketDto, KitchenUrgencyTier } from "@/lib/kitchen/types";

export type KitchenColumnId = "pending" | "preparing" | "ready";

export type KitchenTicketCardModel = {
  orderId: number;
  orderNumber: string;
  tableNumber: number;
  customerName: string | null;
  orderNotes: string | null;
  status: KitchenColumnId;
  linesSummary: string;
  lineCount: number;
  elapsedMinutes: number;
  columnElapsedMinutes: number;
  urgencyTier: KitchenUrgencyTier;
  canStartPreparing: boolean;
  canMarkReady: boolean;
  canMarkServed: boolean;
};

export function formatElapsedMinutes(seconds: number): number {
  return Math.max(0, Math.floor(seconds / 60));
}

export function toKitchenTicketCard(ticket: KitchenTicketDto): KitchenTicketCardModel {
  return {
    orderId: ticket.orderId,
    orderNumber: ticket.orderNumber,
    tableNumber: ticket.tableNumber,
    customerName: ticket.customerName,
    orderNotes: ticket.orderNotes,
    status: ticket.status,
    linesSummary: ticket.linesSummary,
    lineCount: ticket.lineCount,
    elapsedMinutes: formatElapsedMinutes(ticket.elapsedSeconds),
    columnElapsedMinutes: formatElapsedMinutes(ticket.columnElapsedSeconds),
    urgencyTier: ticket.urgencyTier,
    canStartPreparing: ticket.status === "pending",
    canMarkReady: ticket.status === "preparing",
    canMarkServed: ticket.status === "ready",
  };
}

export function nextStatusForAction(
  action: "start-preparing" | "mark-ready" | "mark-served"
): "preparing" | "ready" | "served" {
  switch (action) {
    case "start-preparing":
      return "preparing";
    case "mark-ready":
      return "ready";
    case "mark-served":
      return "served";
  }
}

export function urgencyClassName(tier: KitchenUrgencyTier): string {
  switch (tier) {
    case "critical":
      return "border-destructive/60 bg-destructive/5";
    case "elevated":
      return "border-amber-500/50 bg-amber-500/5";
    default:
      return "border-border bg-card";
  }
}
