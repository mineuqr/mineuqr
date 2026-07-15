/**
 * WAITER-TABLE-WORKSPACE-1 — Operational DTO for Waiter Table Workspace.
 * Assembled from Order Read projections + session aggregate fields.
 * Presentation consumes this DTO only (no totals math, no order reconstruction).
 */

export type WaiterWorkspaceLineItemDto = Readonly<{
  lineItemId: number;
  nameAr: string;
  nameEn: string | null;
  quantity: number;
  price: string;
  itemNotes: string | null;
  /** Order Read does not project modifiers today — always empty until projection adds them. */
  modifiers: readonly string[];
}>;

export type WaiterWorkspaceOrderDto = Readonly<{
  orderId: number;
  displayReference: string;
  status: string;
  createdAt: string;
  notes: string | null;
  totalAmount: string;
  lineItems: readonly WaiterWorkspaceLineItemDto[];
}>;

export type WaiterTableWorkspaceDto = Readonly<{
  sessionId: number;
  tableId: number;
  tableNumber: number;
  sessionStatus: string;
  openedAt: string;
  closedAt: string | null;
  orderCount: number;
  /** Maintained session aggregate from dining session (not computed in presentation). */
  sessionTotalAmount: string;
  orders: readonly WaiterWorkspaceOrderDto[];
}>;

export type WaiterFloorTableDto = Readonly<{
  id: number;
  tableNumber: number;
  nameAr: string | null;
  nameEn: string | null;
  status: "occupied" | "available";
  sessionId: number | null;
  sessionStatus: string | null;
  totalOrders: number | null;
  /** Session aggregate total when occupied; null when available / unset. */
  sessionTotalAmount: string | null;
}>;
