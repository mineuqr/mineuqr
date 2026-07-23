/**
 * SETTLEMENT-RECORD-IMPLEMENTATION-1 — repository immutability / idempotency.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  values: vi.fn(),
}));

vi.mock("../../../db", () => ({
  getDb: (...a: unknown[]) => mocks.getDb(...a),
}));

import type { SettlementRecord } from "@shared/operational-session";
import {
  deleteSettlementRecord,
  existsSettlementRecord,
  findSettlementRecordByIdentity,
  insertSettlementRecord,
  SettlementRecordPersistenceError,
  updateSettlementRecord,
} from "../settlementRecordRepository";

function sampleRecord(
  overrides: Partial<SettlementRecord> = {}
): SettlementRecord {
  return {
    settlementRecordId: "sr:1:100:settlement:1",
    restaurantId: 1,
    recordKind: "settlement",
    schemaVersion: 1,
    recordGeneration: 1,
    checkId: 100,
    sessionId: 10,
    financialReference: "fin:check:100:gen:1",
    priorSettlementRecordId: null,
    orderRefs: [{ orderId: 55 }],
    orderSettlementRefs: [],
    subtotal: "20.00",
    discountAmount: "0.00",
    taxAmount: "0.00",
    grandTotal: "20.00",
    outcome: "paid",
    currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
    taxPolicySnapshot: {
      version: 1,
      enabled: false,
      mode: "exclusive",
      components: [],
    },
    taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
    paymentSnapshot: [],
    businessDay: "2026-07-23",
    settledAt: "2026-07-23 13:00:00",
    createdAt: "2026-07-23 13:00:00",
    createdByActorType: null,
    createdByActorId: null,
    producer: "check_aggregate",
    ...overrides,
  };
}

describe("settlementRecordRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const chain = {
      values: mocks.values,
      from: mocks.from,
      where: mocks.where,
      limit: mocks.limit,
    };
    mocks.insert.mockReturnValue(chain);
    mocks.select.mockReturnValue(chain);
    mocks.from.mockReturnValue(chain);
    mocks.where.mockReturnValue(chain);
    mocks.limit.mockResolvedValue([]);
    mocks.values.mockResolvedValue([{ insertId: 7 }]);
    mocks.getDb.mockResolvedValue({
      insert: mocks.insert,
      select: mocks.select,
    });
  });

  it("inserts settlement record and returns surrogate id", async () => {
    const id = await insertSettlementRecord(sampleRecord());
    expect(id).toBe(7);
    expect(mocks.insert).toHaveBeenCalled();
    expect(mocks.values).toHaveBeenCalled();
  });

  it("maps duplicate key to DUPLICATE persistence error", async () => {
    mocks.values.mockRejectedValue({ errno: 1062, message: "Duplicate" });
    await expect(insertSettlementRecord(sampleRecord())).rejects.toMatchObject({
      name: "SettlementRecordPersistenceError",
      code: "DUPLICATE",
    });
  });

  it("find/exists by business identity is tenant scoped", async () => {
    const row = {
      id: 7,
      settlementRecordId: "sr:1:100:settlement:1",
      restaurantId: 1,
      recordKind: "settlement",
      schemaVersion: 1,
      recordGeneration: 1,
      checkId: 100,
      sessionId: 10,
      financialReference: "fin:check:100:gen:1",
      priorSettlementRecordId: null,
      orderRefsJson: [{ orderId: 55 }],
      orderSettlementRefsJson: [],
      subtotal: "20.00",
      discountAmount: "0.00",
      taxAmount: "0.00",
      grandTotal: "20.00",
      outcome: "paid",
      currencySnapshotJson: { currencyCode: "SAR", currencySymbol: "ر.س" },
      taxPolicySnapshotJson: {
        version: 1,
        enabled: false,
        mode: "exclusive",
        components: [],
      },
      taxBreakdownJson: { totalTaxAmount: "0.00", lines: [] },
      paymentSnapshotJson: [],
      businessDay: "2026-07-23",
      settledAt: "2026-07-23 13:00:00",
      createdAt: "2026-07-23 13:00:00",
      createdByActorType: null,
      createdByActorId: null,
      producer: "check_aggregate",
    };
    mocks.limit.mockResolvedValueOnce([row]);
    const found = await findSettlementRecordByIdentity({
      restaurantId: 1,
      checkId: 100,
      recordKind: "settlement",
      recordGeneration: 1,
    });
    expect(found?.grandTotal).toBe("20.00");
    expect(found?.settlementRecordId).toBe("sr:1:100:settlement:1");

    mocks.limit.mockResolvedValueOnce([row]);
    await expect(
      existsSettlementRecord({
        restaurantId: 1,
        checkId: 100,
        recordKind: "settlement",
        recordGeneration: 1,
      })
    ).resolves.toBe(true);
  });

  it("forbids UPDATE and DELETE (SR-INV-02)", async () => {
    await expect(updateSettlementRecord()).rejects.toThrow(/append-only|forbidden/i);
    await expect(deleteSettlementRecord()).rejects.toThrow(/append-only|forbidden/i);
    expect(SettlementRecordPersistenceError).toBeDefined();
  });
});
