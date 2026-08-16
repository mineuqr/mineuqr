export type PosCheckIntakeIdempotencyKey = {
  restaurantId: number;
  terminalId: string;
  userId: number;
  idempotencyKey: string;
};

export type PosCheckIntakeIdempotencyRecord = {
  restaurantId: number;
  terminalId: string;
  userId: number;
  idempotencyKey: string;
  fingerprint: string;
  orderId: number;
  checkId: number;
  outcome: "open";
  sessionId: number | null;
  createdAt: string;
};

export type PosCheckIntakeIdempotencyStore = {
  get(
    input: PosCheckIntakeIdempotencyKey
  ): Promise<PosCheckIntakeIdempotencyRecord | null>;
  put(record: PosCheckIntakeIdempotencyRecord): Promise<void>;
  runExclusive<T>(
    input: PosCheckIntakeIdempotencyKey,
    fn: () => Promise<T>
  ): Promise<T>;
};
