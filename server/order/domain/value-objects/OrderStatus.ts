export const ORDER_STATUSES = [
  "pending",
  "preparing",
  "ready",
  "served",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const TERMINAL_ORDER_STATUSES: readonly OrderStatus[] = [
  "served",
  "cancelled",
];

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return TERMINAL_ORDER_STATUSES.includes(status);
}

export function assertOrderStatus(value: string): OrderStatus {
  if (!(ORDER_STATUSES as readonly string[]).includes(value)) {
    throw new Error(`Invalid order status: ${value}`);
  }
  return value as OrderStatus;
}
