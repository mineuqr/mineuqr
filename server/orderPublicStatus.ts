/** PR-CUX-1B — customer-safe order status (no internal ids or PII). */
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
};

export type OrderPublicStatusRow = {
  orderId: number;
  orderNumber: string;
  tableNumber: number;
  status: OrderLifecycleStatus;
  totalAmount: string;
  createdAt: string;
  nameAr: string;
  nameEn: string | null;
  currencySymbol: string | null;
  tableLabel: string | null;
  itemCount: number;
};

export function toPublicOrderStatus(row: OrderPublicStatusRow): PublicOrderStatus {
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
  };
}
