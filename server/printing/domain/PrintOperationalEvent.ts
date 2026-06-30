export const PRINT_OPERATIONAL_EVENTS = {
  PrintRequested: "PrintRequested",
  PrintDispatched: "PrintDispatched",
  PrintStarted: "PrintStarted",
  PrintCompleted: "PrintCompleted",
  PrintFailed: "PrintFailed",
  PrintCancelled: "PrintCancelled",
} as const;

export type PrintOperationalEventType =
  (typeof PRINT_OPERATIONAL_EVENTS)[keyof typeof PRINT_OPERATIONAL_EVENTS];

export type PrintOperationalEvent = {
  eventType: PrintOperationalEventType;
  printJobId: number;
  restaurantId: number;
  orderId: number;
  orderNumber: string;
  fromStatus?: string | null;
  toStatus: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
};
