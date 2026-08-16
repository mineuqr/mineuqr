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
  runExclusive<T>(input: PosSaleIdempotencyKey, fn: () => Promise<T>): Promise<T>;
};
