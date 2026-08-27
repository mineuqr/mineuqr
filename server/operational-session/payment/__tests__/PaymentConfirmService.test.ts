/**
 * PAYMENT-CONFIRM-SERVICE-1 — façade delegates to certified settle.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  settleCheckPaidByIdDetailed: vi.fn(),
  settleCashierPosOrderPaidByIdDetailed: vi.fn(),
  opsLog: vi.fn(),
}));

vi.mock("../../../_core/opsLog", () => ({
  opsLog: (...a: unknown[]) => mocks.opsLog(...a),
}));

vi.mock("../../check/CheckService", () => ({
  settleCheckPaidByIdDetailed: (...a: unknown[]) =>
    mocks.settleCheckPaidByIdDetailed(...a),
  settleCashierPosOrderPaidByIdDetailed: (...a: unknown[]) =>
    mocks.settleCashierPosOrderPaidByIdDetailed(...a),
}));

import { confirmPayment } from "../PaymentConfirmService";
import { OPS_EVENT } from "../../../_core/opsTaxonomy";
import { CollectionFactError } from "@shared/operational-session/payment/collection-fact";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform";
import { InMemoryCollectionFactStore } from "../collection-fact/InMemoryCollectionFactStore";

const FINANCIAL = {
  check: {
    id: 100,
    restaurantId: 1,
    sessionId: null,
    outcome: "paid",
    grandTotal: "42.50",
  },
  settlementRecord: { record: { settlementRecordId: "sr-1" } },
};

const CONFIRM_FREEZE = {
  restaurantId: 1,
  checkId: 10,
  orderId: 44,
  orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
  subtotal: "100.00",
  discountAmount: "0.00",
  taxAmount: "15.00",
  grandTotal: "115.00",
  currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
  taxPolicySnapshot: {
    version: 1,
    enabled: true,
    mode: "exclusive" as const,
    components: [{ id: "vat", name: "VAT", ratePercent: "15.00" }],
  },
  taxBreakdown: {
    lines: [
      {
        componentId: "vat",
        name: "VAT",
        ratePercent: "15.00",
        amount: "15.00",
      },
    ],
    totalTaxAmount: "15.00",
  },
  businessDay: "2026-08-20",
  tenders: [{ paymentMethod: "cash", amount: "115.00" }],
  composition: [
    {
      sequence: 1,
      description: "Kabsa",
      netAmount: "100.00",
      taxAmount: "15.00",
      originOrderId: 44,
    },
  ],
};

describe("confirmPayment", () => {
  beforeEach(() => {
    mocks.settleCheckPaidByIdDetailed.mockReset();
    mocks.settleCashierPosOrderPaidByIdDetailed.mockReset();
    mocks.opsLog.mockReset();
    mocks.settleCheckPaidByIdDetailed.mockResolvedValue(FINANCIAL);
    mocks.settleCashierPosOrderPaidByIdDetailed.mockResolvedValue(FINANCIAL);
  });

  it("rejects Check-id Confirm; Cashier orderId is the only financial Confirm path", async () => {
    await expect(
      confirmPayment({
        restaurantId: 1,
        checkId: 100,
        settlements: [{ paymentMethod: "cash", amount: "42.50" }],
      })
    ).rejects.toMatchObject({
      code: "VALIDATION",
      message: "Financial settlement requires Cashier Confirm",
    });
    expect(mocks.settleCheckPaidByIdDetailed).not.toHaveBeenCalled();
    expect(mocks.settleCashierPosOrderPaidByIdDetailed).not.toHaveBeenCalled();
    expect(mocks.opsLog).not.toHaveBeenCalled();
  });

  it("propagates certified settle errors without wrapping them", async () => {
    const err = new Error("Cannot finalize check from outcome paid");
    mocks.settleCashierPosOrderPaidByIdDetailed.mockRejectedValue(err);
    await expect(
      confirmPayment({
        restaurantId: 1,
        orderId: 55,
        paymentIntentId: "cpi_confirm-1",
        idempotencyKey: "cashier-settle-aaaaaaa",
        terminalId: "11111111-1111-4111-8111-111111111111",
        actorType: "staff_user",
        actorUserId: 7,
      })
    ).rejects.toBe(err);
    expect(mocks.opsLog).not.toHaveBeenCalled();
  });

  it("routes cashier_pos Confirm with orderId to settleCashierPosOrderPaidByIdDetailed", async () => {
    const result = await confirmPayment({
      restaurantId: 1,
      orderId: 55,
      billDiscountAmount: "1.00",
      awaitAttribution: false,
      paymentIntentId: "cpi_confirm-1",
      idempotencyKey: "cashier-settle-aaaaaaa",
      terminalId: "11111111-1111-4111-8111-111111111111",
      actorType: "staff_user",
      actorUserId: 7,
    });
    expect(mocks.settleCashierPosOrderPaidByIdDetailed).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: 1,
        orderId: 55,
        billDiscountAmount: "1.00",
        awaitAttribution: false,
        deferOperationalSettlementAfterCollectionFact: true,
        actorUserId: 7,
        terminalId: "11111111-1111-4111-8111-111111111111",
        productionCollectionCommit: expect.any(Function),
      })
    );
    expect(mocks.settleCheckPaidByIdDetailed).not.toHaveBeenCalled();
    expect(result).toBe(FINANCIAL);
  });

  it("rejects cashier Confirm without a legitimate paymentIntentId", async () => {
    await expect(
      confirmPayment({
        restaurantId: 1,
        orderId: 55,
        paymentIntentId: "55",
        idempotencyKey: "cashier-settle-aaaaaaa",
        terminalId: "11111111-1111-4111-8111-111111111111",
        actorType: "staff_user",
        actorUserId: 7,
      })
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      confirmPayment({
        restaurantId: 1,
        orderId: 55,
        idempotencyKey: "cashier-settle-aaaaaaa",
        terminalId: "11111111-1111-4111-8111-111111111111",
        actorType: "staff_user",
        actorUserId: 7,
      })
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect(mocks.settleCashierPosOrderPaidByIdDetailed).not.toHaveBeenCalled();
  });

  it("rejects cashier Confirm without terminal or actor identity before settle", async () => {
    await expect(
      confirmPayment({
        restaurantId: 1,
        orderId: 55,
        paymentIntentId: "cpi_confirm-1",
        idempotencyKey: "cashier-settle-aaaaaaa",
        actorUserId: 7,
      })
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      confirmPayment({
        restaurantId: 1,
        orderId: 55,
        paymentIntentId: "cpi_confirm-1",
        idempotencyKey: "cashier-settle-aaaaaaa",
        terminalId: "11111111-1111-4111-8111-111111111111",
      })
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect(mocks.settleCashierPosOrderPaidByIdDetailed).not.toHaveBeenCalled();
    expect(mocks.opsLog).not.toHaveBeenCalled();
  });

  it("commits Collection Fact from the Check freeze before treating Confirm as PAID", async () => {
    const store = new InMemoryCollectionFactStore();
    mocks.settleCashierPosOrderPaidByIdDetailed.mockImplementation(
      async (input: {
        productionCollectionCommit?: (freeze: typeof CONFIRM_FREEZE) => Promise<void>;
      }) => {
        await input.productionCollectionCommit?.(CONFIRM_FREEZE);
        return FINANCIAL;
      }
    );
    const result = await confirmPayment({
      restaurantId: 1,
      orderId: 44,
      paymentIntentId: "cpi_confirm-1",
      idempotencyKey: "cashier-settle-aaaaaaa",
      terminalId: "11111111-1111-4111-8111-111111111111",
      actorType: "staff_user",
      actorUserId: 7,
      collectionFactStore: store,
    });
    expect(result.check.outcome).toBe("paid");
    expect(store.snapshot()).toHaveLength(1);
    expect(store.snapshot()[0].paymentIntentId).toBe("cpi_confirm-1");
    expect(store.snapshot()[0].amount).toBe("115.00");
    expect(mocks.opsLog).toHaveBeenCalledWith(
      expect.objectContaining({
        type: OPS_EVENT.payment_confirm,
        metadata: expect.objectContaining({
          collectionFactCommit: true,
          collectionFactOutcome: "created",
          outcome: "paid",
        }),
      })
    );
  });

  it("logs PAID after Collection Fact even when Check is still OPEN", async () => {
    const store = new InMemoryCollectionFactStore();
    mocks.settleCashierPosOrderPaidByIdDetailed.mockImplementation(
      async (input: {
        productionCollectionCommit?: (freeze: typeof CONFIRM_FREEZE) => Promise<void>;
      }) => {
        await input.productionCollectionCommit?.(CONFIRM_FREEZE);
        return {
          ...FINANCIAL,
          check: { ...FINANCIAL.check, outcome: "open" },
          settlementRecord: { record: null, outcome: "skipped" },
        };
      }
    );
    await confirmPayment({
      restaurantId: 1,
      orderId: 44,
      paymentIntentId: "cpi_confirm-1",
      idempotencyKey: "cashier-settle-aaaaaaa",
      terminalId: "11111111-1111-4111-8111-111111111111",
      actorType: "staff_user",
      actorUserId: 7,
      collectionFactStore: store,
    });
    expect(store.snapshot()).toHaveLength(1);
    expect(mocks.opsLog).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          collectionFactOutcome: "created",
          outcome: "paid",
        }),
      })
    );
  });

  it("replays the same Collection Fact on retry", async () => {
    const store = new InMemoryCollectionFactStore();
    mocks.settleCashierPosOrderPaidByIdDetailed.mockImplementation(
      async (input: {
        productionCollectionCommit?: (freeze: typeof CONFIRM_FREEZE) => Promise<void>;
      }) => {
        await input.productionCollectionCommit?.(CONFIRM_FREEZE);
        return FINANCIAL;
      }
    );
    const command = {
      restaurantId: 1,
      orderId: 44,
      paymentIntentId: "cpi_confirm-1",
      idempotencyKey: "cashier-settle-aaaaaaa",
      terminalId: "11111111-1111-4111-8111-111111111111",
      actorType: "staff_user" as const,
      actorUserId: 7,
      collectionFactStore: store,
    };
    await confirmPayment(command);
    await confirmPayment(command);
    expect(store.snapshot()).toHaveLength(1);
    expect(mocks.opsLog).toHaveBeenLastCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          collectionFactOutcome: "replayed",
          outcome: "paid",
        }),
      })
    );
  });

  it("does not emit payment.confirm when Collection Fact storage fails", async () => {
    const failingStore = {
      insert: async () => {
        throw new CollectionFactError("STORAGE", "disk full");
      },
      findByIdempotency: async () => null,
      findByPaymentIntent: async () => null,
      findByFactId: async () => null,
    };
    mocks.settleCashierPosOrderPaidByIdDetailed.mockImplementation(
      async (input: {
        productionCollectionCommit?: (freeze: typeof CONFIRM_FREEZE) => Promise<void>;
      }) => {
        await input.productionCollectionCommit?.(CONFIRM_FREEZE);
        return FINANCIAL;
      }
    );
    await expect(
      confirmPayment({
        restaurantId: 1,
        orderId: 44,
        paymentIntentId: "cpi_confirm-1",
        idempotencyKey: "cashier-settle-aaaaaaa",
        terminalId: "11111111-1111-4111-8111-111111111111",
        actorType: "staff_user",
        actorUserId: 7,
        collectionFactStore: failingStore,
      })
    ).rejects.toMatchObject({ code: "STORAGE" });
    expect(mocks.opsLog).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: OPS_EVENT.payment_confirm })
    );
  });
});
