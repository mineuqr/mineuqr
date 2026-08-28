/**
 * INCOMING-CONFIRM-ORDER-LOCK-HARDENING-1
 * Concurrent Confirm with distinct keys on the same Incoming Order
 * must produce one production Collection Fact.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ORDERING_CHANNEL_QR } from "@shared/ordering-platform";
import type { CollectionFact } from "@shared/operational-session/payment/collection-fact";
import type { CashierPaidMoneyFreeze } from "../commitCashierProductionCollectionFact";

const mocks = vi.hoisted(() => ({
  findProductionCollectionFactByOrderId: vi.fn(),
  allocateCashierInvoiceForOrder: vi.fn(),
  commitCollectionFact: vi.fn(),
}));

vi.mock("../collectionFactRepository", () => ({
  findProductionCollectionFactByOrderId: (...a: unknown[]) =>
    mocks.findProductionCollectionFactByOrderId(...a),
  createDrizzleCollectionFactStore: (tx: unknown) => ({ tx }),
}));

vi.mock("../../../../pos/cashier-invoice/cashierInvoiceRepository", () => ({
  allocateCashierInvoiceForOrder: (...a: unknown[]) =>
    mocks.allocateCashierInvoiceForOrder(...a),
}));

vi.mock("../CollectionFactService", () => ({
  commitCollectionFact: (...a: unknown[]) => mocks.commitCollectionFact(...a),
}));

vi.mock("../../../../_core/opsLog", () => ({
  opsLog: () => undefined,
}));

import { runIncomingCashierCollectionFactTransaction } from "../commitCashierProductionCollectionFact";

const FREEZE: CashierPaidMoneyFreeze = {
  restaurantId: 1,
  checkId: null,
  orderId: 44,
  orderingChannel: ORDERING_CHANNEL_QR,
  subtotal: "100.00",
  discountAmount: "0.00",
  taxAmount: "15.00",
  grandTotal: "115.00",
  currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
  taxPolicySnapshot: {
    version: 1,
    enabled: true,
    mode: "exclusive",
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
  businessDay: "2026-08-27",
};

const FACT: CollectionFact = {
  collectionFactId: "pcf_1",
  restaurantId: 1,
  orderId: 44,
  paymentIntentId: "cpi_k1",
  orderingChannel: ORDERING_CHANNEL_QR,
  kind: "collection",
  purpose: "production",
  schemaVersion: 1,
  subtotal: "100.00",
  discountAmount: "0.00",
  taxAmount: "15.00",
  amount: "115.00",
  currencyCode: "SAR",
  currencySnapshot: FREEZE.currencySnapshot,
  taxPolicySnapshot: FREEZE.taxPolicySnapshot,
  taxBreakdown: FREEZE.taxBreakdown,
  composition: [...FREEZE.composition],
  tenders: [...FREEZE.tenders],
  checkId: null,
  actorType: "staff_user",
  actorId: "7",
  terminalId: "term-1",
  businessDay: "2026-08-27",
  idempotencyKey: "settle_k1",
  fingerprint: "fp",
  committedAt: "2026-08-27T00:00:00.000Z",
  createdAt: "2026-08-27T00:00:00.000Z",
};

function input(key: string, intent: string) {
  return {
    paymentIntentId: intent,
    idempotencyKey: key,
    terminalId: "term-1",
    actorType: "staff_user",
    actorUserId: 7,
    freeze: FREEZE,
  };
}

function lockingTx(orderId = 44) {
  let held = false;
  const waiters: Array<() => void> = [];
  const events: string[] = [];
  const tx = {
    events,
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => ({
            for: async (mode: string) => {
              expect(mode).toBe("update");
              events.push("lock");
              while (held) {
                await new Promise<void>((resolve) => waiters.push(resolve));
              }
              held = true;
              return [{ id: orderId, restaurantId: 1 }];
            },
          }),
        }),
      }),
    }),
    unlock() {
      held = false;
      const pending = waiters.splice(0);
      for (const resume of pending) resume();
    },
  };
  return tx;
}

describe("Incoming Confirm Order lock", () => {
  beforeEach(() => {
    mocks.findProductionCollectionFactByOrderId.mockReset();
    mocks.allocateCashierInvoiceForOrder.mockReset();
    mocks.commitCollectionFact.mockReset();
    mocks.allocateCashierInvoiceForOrder.mockResolvedValue({
      restaurantId: 1,
      orderId: 44,
      sequenceNumber: 1,
      invoiceNumber: "000001",
    });
  });

  it("replays an existing production CF without allocating Invoice or inserting", async () => {
    mocks.findProductionCollectionFactByOrderId.mockResolvedValue(FACT);
    const tx = lockingTx();
    const result = await runIncomingCashierCollectionFactTransaction(
      tx as never,
      input("settle_k2", "cpi_k2")
    );
    tx.unlock();
    expect(result).toEqual({ outcome: "replayed", fact: FACT });
    expect(mocks.allocateCashierInvoiceForOrder).not.toHaveBeenCalled();
    expect(mocks.commitCollectionFact).not.toHaveBeenCalled();
    expect(tx.events[0]).toBe("lock");
  });

  it("inserts one CF when none exists after the Order lock", async () => {
    mocks.findProductionCollectionFactByOrderId.mockResolvedValue(null);
    mocks.commitCollectionFact.mockResolvedValue({
      outcome: "created",
      fact: FACT,
    });
    const tx = lockingTx();
    const result = await runIncomingCashierCollectionFactTransaction(
      tx as never,
      input("settle_k1", "cpi_k1")
    );
    tx.unlock();
    expect(result.outcome).toBe("created");
    expect(mocks.allocateCashierInvoiceForOrder).toHaveBeenCalledTimes(1);
    expect(mocks.commitCollectionFact).toHaveBeenCalledTimes(1);
    expect(tx.events[0]).toBe("lock");
    expect(mocks.findProductionCollectionFactByOrderId).toHaveBeenCalledWith(
      { restaurantId: 1, orderId: 44 },
      tx
    );
  });

  it("does not insert when the Order row is missing", async () => {
    const tx = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => ({
              for: async () => [],
            }),
          }),
        }),
      }),
    };
    await expect(
      runIncomingCashierCollectionFactTransaction(
        tx as never,
        input("settle_k1", "cpi_k1")
      )
    ).rejects.toMatchObject({ code: "STORAGE" });
    expect(mocks.findProductionCollectionFactByOrderId).not.toHaveBeenCalled();
    expect(mocks.commitCollectionFact).not.toHaveBeenCalled();
  });

  it("serializes K1 and K2 on the same Order so the second Confirm replays", async () => {
    let stored: CollectionFact | null = null;
    mocks.findProductionCollectionFactByOrderId.mockImplementation(async () => stored);
    mocks.commitCollectionFact.mockImplementation(async () => {
      stored = FACT;
      return { outcome: "created" as const, fact: FACT };
    });
    const tx = lockingTx();
    const first = runIncomingCashierCollectionFactTransaction(
      tx as never,
      input("settle_k1", "cpi_k1")
    ).then((result) => {
      tx.unlock();
      return result;
    });
    const second = runIncomingCashierCollectionFactTransaction(
      tx as never,
      input("settle_k2", "cpi_k2")
    ).then((result) => {
      tx.unlock();
      return result;
    });
    const [a, b] = await Promise.all([first, second]);
    const outcomes = [a.outcome, b.outcome].sort();
    expect(outcomes).toEqual(["created", "replayed"]);
    expect(mocks.commitCollectionFact).toHaveBeenCalledTimes(1);
    expect(mocks.allocateCashierInvoiceForOrder).toHaveBeenCalledTimes(1);
    expect(a.fact.collectionFactId).toBe(b.fact.collectionFactId);
  });

  it("lets different Orders confirm concurrently with independent collections", async () => {
    const facts = new Map<number, CollectionFact>();
    mocks.findProductionCollectionFactByOrderId.mockImplementation(
      async (lookup: { orderId: number }) => facts.get(lookup.orderId) ?? null
    );
    mocks.allocateCashierInvoiceForOrder.mockImplementation(
      async (lookup: { restaurantId: number; orderId: number }) => ({
        restaurantId: lookup.restaurantId,
        orderId: lookup.orderId,
        sequenceNumber: lookup.orderId,
        invoiceNumber: String(lookup.orderId).padStart(6, "0"),
      })
    );
    mocks.commitCollectionFact.mockImplementation(async (payload: { command: { orderId: number } }) => {
      const orderId = payload.command.orderId;
      const fact = {
        ...FACT,
        collectionFactId: `pcf_${orderId}`,
        orderId,
        paymentIntentId: `cpi_${orderId}`,
      };
      facts.set(orderId, fact);
      return { outcome: "created" as const, fact };
    });
    const txA = lockingTx(44);
    const txB = lockingTx(45);
    const [a, b] = await Promise.all([
      runIncomingCashierCollectionFactTransaction(txA as never, {
        ...input("settle_k1", "cpi_44"),
        freeze: { ...FREEZE, orderId: 44 },
      }).then((result) => {
        txA.unlock();
        return result;
      }),
      runIncomingCashierCollectionFactTransaction(txB as never, {
        ...input("settle_k2", "cpi_45"),
        freeze: { ...FREEZE, orderId: 45 },
      }).then((result) => {
        txB.unlock();
        return result;
      }),
    ]);
    expect(a.outcome).toBe("created");
    expect(b.outcome).toBe("created");
    expect(a.fact.collectionFactId).not.toBe(b.fact.collectionFactId);
    expect(a.fact.orderId).toBe(44);
    expect(b.fact.orderId).toBe(45);
    expect(mocks.commitCollectionFact).toHaveBeenCalledTimes(2);
    expect(mocks.allocateCashierInvoiceForOrder).toHaveBeenCalledTimes(2);
  });
});
