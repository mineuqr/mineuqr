/** PR-CUX-1B — customer-safe order status (no internal ids or PII). */
import { isTrackingExpired } from "./orderTrackingExpiry";
import { isTerminalDiningSessionStatus } from "./diningSession/sessionTypes";
import type { DiningSessionStatus } from "./diningSession/sessionTypes";

export type OrderLifecycleStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "served"
  | "cancelled";

export type PublicOrderStatus = {
  orderNumber: string;
  createdAt: string;
  tableNumber: number;
  itemCount: number;
  totalAmount: string;
  status: OrderLifecycleStatus;
  restaurantName: string;
  restaurantNameEn: string | null;
  currencySymbol: string;
  tableLabel: "tables" | "rooms";
  readyAt: string | null;
  trackingExpired: boolean;
  diningSessionEnded: boolean;
  diningSessionStatus: DiningSessionStatus | null;
  diningSessionToken: string | null;
};

export type OrderPublicStatusRow = {
  orderId: number;
  sessionId?: number | null;
  orderNumber: string;
  tableNumber: number;
  status: OrderLifecycleStatus;
  totalAmount: string;
  createdAt: string;
  readyAt: string | null;
  nameAr: string;
  nameEn: string | null;
  currencySymbol: string | null;
  tableLabel: string | null;
  itemCount: number;
};

export function toPublicOrderStatus(
  row: OrderPublicStatusRow,
  options?: {
    nowMs?: number;
    diningSessionStatus?: DiningSessionStatus | null;
    diningSessionToken?: string | null;
  }
): PublicOrderStatus {
  const trackingExpired = isTrackingExpired(row.readyAt, options?.nowMs);
  const diningSessionStatus = options?.diningSessionStatus ?? null;
  const diningSessionEnded =
    diningSessionStatus != null && isTerminalDiningSessionStatus(diningSessionStatus);

  return {
    orderNumber: row.orderNumber,
    createdAt: row.createdAt,
    tableNumber: row.tableNumber,
    itemCount: row.itemCount,
    totalAmount: row.totalAmount,
    status: row.status,
    restaurantName: row.nameAr,
    restaurantNameEn: row.nameEn,
    currencySymbol: row.currencySymbol || "ر.س",
    tableLabel: row.tableLabel === "rooms" ? "rooms" : "tables",
    readyAt: row.readyAt,
    trackingExpired,
    diningSessionEnded,
    diningSessionStatus,
    diningSessionToken: options?.diningSessionToken ?? null,
  };
}
