export const PRINT_PAYLOAD_SCHEMA_VERSION = 1 as const;

export type PrintPayloadLineItem = {
  lineItemId: number;
  menuItemId: number;
  nameAr: string;
  nameEn?: string | null;
  quantity: number;
  price: string;
};

export type PrintPayloadTrigger = {
  source: "order_event" | "operator" | "reprint";
  eventType?: string | null;
  eventId?: string | null;
  operatorUserId?: number | null;
  reason?: string | null;
};

export type PrintPayload = {
  schemaVersion: typeof PRINT_PAYLOAD_SCHEMA_VERSION;
  restaurantId: number;
  orderId: number;
  orderNumber: string;
  displayOrderNumber?: string | null;
  displayReference?: string | null;
  businessDay?: string | null;
  orderStatus: string;
  tableNumber: number;
  customerName?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
  totalAmount: string;
  createdAt: string;
  lineItems: PrintPayloadLineItem[];
  requestedAt: string;
  trigger: PrintPayloadTrigger;
};
