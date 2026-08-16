export type PosSettlementInitiateIdempotencyKey = {
  restaurantId: number;
  terminalId: string;
  userId: number;
  idempotencyKey: string;
};

export type PosSettlementInitiateIdempotencyRecord = {
  restaurantId: number;
  terminalId: string;
  userId: number;
  idempotencyKey: string;
  fingerprint: string;
  orderId: number;
  checkId: number;
  outcome: "paid";
  grandTotal: string;
  settlementRecordId: string | null;
  sessionId: number | null;
  registerId: string | null;
  financialShiftId: string | null;
  createdAt: string;
};

export type PosSettlementInitiateIdempotencyStore = {
  get(
    input: PosSettlementInitiateIdempotencyKey
  ): Promise<PosSettlementInitiateIdempotencyRecord | null>;
  put(record: PosSettlementInitiateIdempotencyRecord): Promise<void>;
  runExclusive<T>(
    input: PosSettlementInitiateIdempotencyKey,
    fn: () => Promise<T>
  ): Promise<T>;
};
