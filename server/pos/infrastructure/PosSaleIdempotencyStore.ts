/**
 * 0098 leftover NOT NULL column. Not a Check identity and not a fake Check.
 * Sale replay is keyed by orderId. Do not treat 0 as operational_checks.id.
 */
export const POS_SALE_IDEMPOTENCY_UNASSIGNED_CHECK_ID = 0;

export type PosSaleIdempotencyRecord = {
  restaurantId: number;
  terminalId: string;
  userId: number;
  idempotencyKey: string;
  fingerprint: string;
  orderId: number;
  orderNumber: string;
  trackingToken: string;
  displayReference: string;
  totalAmount: string;
  itemCount: number;
  checkId: number;
  subtotal: string;
  taxAmount: string;
  grandTotal: string;
  billDiscountAmount: string;
  lines: readonly {
    description: string;
    quantity: number;
    netAmount: string;
    originOrderItemId: number | null;
  }[];
  createdAt: string;
};

export type PosSaleIdempotencyKey = {
  restaurantId: number;
  terminalId: string;
  userId: number;
  idempotencyKey: string;
};

export type PosSaleIdempotencyStore = {
  get(input: PosSaleIdempotencyKey): Promise<PosSaleIdempotencyRecord | null>;
  put(record: PosSaleIdempotencyRecord): Promise<void>;
  /**
   * Insert on the caller's DB transaction. Unique collision always throws
   * (does not treat same-fingerprint as success) so the companion Order tx rolls back.
   */
  putInTransaction(tx: unknown, record: PosSaleIdempotencyRecord): Promise<void>;
  runExclusive<T>(input: PosSaleIdempotencyKey, fn: () => Promise<T>): Promise<T>;
};
