/**
 * SETTLEMENT-RECORD-IMPLEMENTATION-1 — atomic finalize integration + idempotency.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listActiveOrderIdsForCheck: vi.fn(),
  findSettlementRecordByIdentity: vi.fn(),
  insertSettlementRecord: vi.fn(),
  existsSettlementRecord: vi.fn(),
}));

vi.mock("../checkOrderMembershipRepository", () => ({
  listActiveOrderIdsForCheck: (...a: unknown[]) =>
    mocks.listActiveOrderIdsForCheck(...a),
}));

vi.mock("../settlementRecordRepository", () => {
  class SettlementRecordPersistenceError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = "SettlementRecordPersistenceError";
      this.code = code;
    }
  }
  return {
    SettlementRecordPersistenceError,
    findSettlementRecordByIdentity: (...a: unknown[]) =>
      mocks.findSettlementRecordByIdentity(...a),
    insertSettlementRecord: (...a: unknown[]) =>
      mocks.insertSettlementRecord(...a),
    existsSettlementRecord: (...a: unknown[]) =>
      mocks.existsSettlementRecord(...a),
  };
});

import { createSettlementRecordForCheckFinalize } from "../checkSettlementRecordIntegration";
import { SettlementRecordPersistenceError } from "../settlementRecordRepository";
import type { OperationalCheck } from "@shared/operational-session";

const check: OperationalCheck = {
  id: 100,
  restaurantId: 1,
  sessionId: 10,
  outcome: "open",
  currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
  taxPolicySnapshot: {
    version: 1,
    enabled: false,
    mode: "exclusive",
    components: [],
  },
  serviceChargeSnapshot: null,
  billDiscountAmount: "0.00",
  subtotal: "20.00",
  taxAmount: "0.00",
  taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
  grandTotal: "20.00",
  snapshotsFrozenAt: "2026-07-23 12:00:00",
  totalsFrozenAt: null,
  settledAt: null,
  voidedAt: null,
  createdAt: "2026-07-23 12:00:00",
  updatedAt: "2026-07-23 12:00:00",
};

const fakeTx = { __tx: true };

describe("createSettlementRecordForCheckFinalize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listActiveOrderIdsForCheck.mockResolvedValue([55]);
    mocks.findSettlementRecordByIdentity.mockResolvedValue(null);
    mocks.insertSettlementRecord.mockResolvedValue(7);
  });

  it("applies Settlement Record with copied freeze values", async () => {
    const result = await createSettlementRecordForCheckFinalize(
      {
        restaurantId: 1,
        check,
        outcome: "paid",
        freeze: {
          subtotal: "20.00",
          billDiscountAmount: "0.00",
          taxAmount: "0.00",
          taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
          grandTotal: "20.00",
          settledAt: "2026-07-23 13:00:00",
        },
        settlementLines: [
          { paymentMethod: "cash", amount: "20.00", status: "captured" },
        ],
        orderSettlements: [],
        createdAt: "2026-07-23 13:00:00",
      },
      fakeTx as never
    );

    expect(result.outcome).toBe("applied");
    expect(result.record?.grandTotal).toBe("20.00");
    expect(result.record?.paymentSnapshot[0]?.amount).toBe("20.00");
    expect(result.events[0]?.eventType).toBe("SettlementRecordCreated");
    expect(mocks.insertSettlementRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        checkId: 100,
        restaurantId: 1,
        recordKind: "settlement",
        recordGeneration: 1,
      }),
      fakeTx
    );
    expect(mocks.listActiveOrderIdsForCheck).toHaveBeenCalledWith(
      1,
      100,
      fakeTx
    );
  });

  it("is idempotent when record already exists", async () => {
    mocks.findSettlementRecordByIdentity.mockResolvedValue({
      settlementRecordId: "sr:1:100:settlement:1",
      grandTotal: "20.00",
    });

    const result = await createSettlementRecordForCheckFinalize({
      restaurantId: 1,
      check,
      outcome: "paid",
      freeze: {
        subtotal: "20.00",
        billDiscountAmount: "0.00",
        taxAmount: "0.00",
        taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
        grandTotal: "20.00",
        settledAt: "2026-07-23 13:00:00",
      },
      settlementLines: null,
      orderSettlements: [],
      createdAt: "2026-07-23 13:00:00",
    });

    expect(result.outcome).toBe("already_applied");
    expect(mocks.insertSettlementRecord).not.toHaveBeenCalled();
  });

  it("treats concurrent duplicate insert as already_applied", async () => {
    mocks.insertSettlementRecord.mockRejectedValue(
      new SettlementRecordPersistenceError("DUPLICATE", "dup")
    );
    mocks.findSettlementRecordByIdentity
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        settlementRecordId: "sr:1:100:settlement:1",
        grandTotal: "20.00",
      });

    const result = await createSettlementRecordForCheckFinalize({
      restaurantId: 1,
      check,
      outcome: "paid",
      freeze: {
        subtotal: "20.00",
        billDiscountAmount: "0.00",
        taxAmount: "0.00",
        taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
        grandTotal: "20.00",
        settledAt: "2026-07-23 13:00:00",
      },
      settlementLines: null,
      orderSettlements: [],
      createdAt: "2026-07-23 13:00:00",
    });

    expect(result.outcome).toBe("already_applied");
  });

  it("propagates non-duplicate insert failures for TX rollback", async () => {
    mocks.insertSettlementRecord.mockRejectedValue(new Error("disk full"));
    await expect(
      createSettlementRecordForCheckFinalize({
        restaurantId: 1,
        check,
        outcome: "paid",
        freeze: {
          subtotal: "20.00",
          billDiscountAmount: "0.00",
          taxAmount: "0.00",
          taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
          grandTotal: "20.00",
          settledAt: "2026-07-23 13:00:00",
        },
        settlementLines: null,
        orderSettlements: [],
        createdAt: "2026-07-23 13:00:00",
      })
    ).rejects.toThrow("disk full");
  });
});
