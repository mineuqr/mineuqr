/**
 * PRODUCTION-COLLECTION-FACT-CASHIER-ADOPTION-1 — Cashier Confirm integration.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform";
import {
  CollectionFactError,
  assertCashierProductionPaymentIdentities,
  collectionFactCommitIsPaid,
} from "@shared/operational-session/payment/collection-fact";
import { InMemoryCollectionFactStore } from "../collection-fact/InMemoryCollectionFactStore";
import {
  commitCashierProductionCollectionFact,
  type CashierPaidMoneyFreeze,
} from "../collection-fact/commitCashierProductionCollectionFact";
import type { CollectionFactStore } from "../collection-fact/collectionFactStore";

vi.mock("../../../_core/opsLog", () => ({
  opsLog: () => undefined,
}));

const FREEZE: CashierPaidMoneyFreeze = {
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

function countingStore(inner: InMemoryCollectionFactStore): {
  store: CollectionFactStore;
  insertCount: () => number;
} {
  let inserts = 0;
  return {
    insertCount: () => inserts,
    store: {
      insert: async (fact) => {
        inserts += 1;
        return inner.insert(fact);
      },
      findByIdempotency: (input) => inner.findByIdempotency(input),
      findByPaymentIntent: (input) => inner.findByPaymentIntent(input),
      findByFactId: (input) => inner.findByFactId(input),
    },
  };
}

const COMMIT = {
  paymentIntentId: "cpi_cashier-intent-1",
  idempotencyKey: "cashier-settle-aaaaaaaa",
  terminalId: "11111111-1111-4111-8111-111111111111",
  actorType: "staff_user" as const,
  actorUserId: 7,
  freeze: FREEZE,
};

describe("cashier production payment identity", () => {
  it("accepts a legitimate paymentIntentId distinct from orderId and idempotencyKey", () => {
    expect(() =>
      assertCashierProductionPaymentIdentities({
        paymentIntentId: COMMIT.paymentIntentId,
        idempotencyKey: COMMIT.idempotencyKey,
        orderId: 44,
        terminalId: COMMIT.terminalId,
        actorType: COMMIT.actorType,
        actorUserId: COMMIT.actorUserId,
      })
    ).not.toThrow();
  });

  it("rejects paymentIntentId equal to orderId, idempotencyKey, or collectionFactId", () => {
    expect(() =>
      assertCashierProductionPaymentIdentities({
        ...COMMIT,
        paymentIntentId: "44",
        orderId: 44,
      })
    ).toThrow(CollectionFactError);
    expect(() =>
      assertCashierProductionPaymentIdentities({
        ...COMMIT,
        paymentIntentId: COMMIT.idempotencyKey,
        orderId: 44,
      })
    ).toThrow(CollectionFactError);
    expect(() =>
      assertCashierProductionPaymentIdentities({
        ...COMMIT,
        paymentIntentId: "pcf_abc",
        orderId: 44,
      })
    ).toThrow(CollectionFactError);
  });

  it("rejects missing terminal and missing actor", () => {
    expect(() =>
      assertCashierProductionPaymentIdentities({
        ...COMMIT,
        terminalId: "",
        orderId: 44,
      })
    ).toThrow(/terminalId/);
    expect(() =>
      assertCashierProductionPaymentIdentities({
        ...COMMIT,
        actorUserId: 0,
        orderId: 44,
      })
    ).toThrow(/actor identity/);
  });
});

describe("commitCashierProductionCollectionFact", () => {
  it("creates one production fact from the Check money freeze", async () => {
    const inner = new InMemoryCollectionFactStore();
    const { store, insertCount } = countingStore(inner);
    const result = await commitCashierProductionCollectionFact(COMMIT, store);
    expect(collectionFactCommitIsPaid(result.outcome)).toBe(true);
    expect(result.outcome).toBe("created");
    expect(result.fact.purpose).toBe("production");
    expect(result.fact.paymentIntentId).toBe(COMMIT.paymentIntentId);
    expect(result.fact.amount).toBe("115.00");
    expect(result.fact.taxAmount).toBe("15.00");
    expect(result.fact.discountAmount).toBe("0.00");
    expect(result.fact.terminalId).toBe(COMMIT.terminalId);
    expect(result.fact.actorId).toBe("7");
    expect(result.fact.checkId).toBe(10);
    expect(insertCount()).toBe(1);
  });

  it("replays the same logical payment without a second insert", async () => {
    const inner = new InMemoryCollectionFactStore();
    const { store, insertCount } = countingStore(inner);
    const first = await commitCashierProductionCollectionFact(COMMIT, store);
    const second = await commitCashierProductionCollectionFact(COMMIT, store);
    expect(first.outcome).toBe("created");
    expect(second.outcome).toBe("replayed");
    expect(second.fact.collectionFactId).toBe(first.fact.collectionFactId);
    expect(insertCount()).toBe(1);
  });

  it("conflicts when the same idempotency key carries a changed amount", async () => {
    const store = new InMemoryCollectionFactStore();
    await commitCashierProductionCollectionFact(COMMIT, store);
    await expect(
      commitCashierProductionCollectionFact(
        {
          ...COMMIT,
          freeze: {
            ...FREEZE,
            grandTotal: "80.00",
            taxAmount: "15.00",
            tenders: [{ paymentMethod: "cash", amount: "80.00" }],
          },
        },
        store
      )
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("does not treat a different paymentIntentId as the same payment", async () => {
    const store = new InMemoryCollectionFactStore();
    await commitCashierProductionCollectionFact(COMMIT, store);
    const other = await commitCashierProductionCollectionFact(
      {
        ...COMMIT,
        paymentIntentId: "cpi_cashier-intent-2",
        idempotencyKey: "cashier-settle-bbbbbbbb",
        freeze: {
          ...FREEZE,
          orderId: 45,
          checkId: 11,
          composition: [
            { ...FREEZE.composition[0], originOrderId: 45 },
          ],
        },
      },
      store
    );
    expect(other.outcome).toBe("created");
    expect(store.snapshot()).toHaveLength(2);
  });

  it("rejects storage failure as not PAID", async () => {
    const inner = new InMemoryCollectionFactStore();
    const store: CollectionFactStore = {
      insert: async () => {
        throw new CollectionFactError("STORAGE", "disk full");
      },
      findByIdempotency: (input) => inner.findByIdempotency(input),
      findByPaymentIntent: (input) => inner.findByPaymentIntent(input),
      findByFactId: (input) => inner.findByFactId(input),
    };
    await expect(
      commitCashierProductionCollectionFact(COMMIT, store)
    ).rejects.toMatchObject({ code: "STORAGE" });
    expect(inner.snapshot()).toHaveLength(0);
  });

  it("conflicts when the same idempotency key carries a changed tax, tender, order, currency, or business day", async () => {
    const cases: Array<Partial<typeof FREEZE>> = [
      {
        taxAmount: "10.00",
        taxBreakdown: {
          lines: [
            {
              componentId: "vat",
              name: "VAT",
              ratePercent: "10.00",
              amount: "10.00",
            },
          ],
          totalTaxAmount: "10.00",
        },
        grandTotal: "110.00",
        tenders: [{ paymentMethod: "cash", amount: "110.00" }],
      },
      { tenders: [{ paymentMethod: "card", amount: "115.00" }] },
      {
        orderId: 99,
        composition: [{ ...FREEZE.composition[0], originOrderId: 99 }],
      },
      {
        currencySnapshot: { currencyCode: "USD", currencySymbol: "$" },
      },
      { businessDay: "2026-08-21" },
      {
        discountAmount: "5.00",
        grandTotal: "110.00",
        tenders: [{ paymentMethod: "cash", amount: "110.00" }],
      },
    ];
    for (const patch of cases) {
      const store = new InMemoryCollectionFactStore();
      await commitCashierProductionCollectionFact(COMMIT, store);
      await expect(
        commitCashierProductionCollectionFact(
          { ...COMMIT, freeze: { ...FREEZE, ...patch } },
          store
        )
      ).rejects.toMatchObject({ code: "CONFLICT" });
      expect(store.snapshot()).toHaveLength(1);
      expect(store.snapshot()[0].amount).toBe("115.00");
      expect(store.snapshot()[0].taxAmount).toBe("15.00");
    }
  });

  it("replays the original fact when terminal or actor changes on an identical financial fingerprint", async () => {
    const store = new InMemoryCollectionFactStore();
    const first = await commitCashierProductionCollectionFact(COMMIT, store);
    const terminalRetry = await commitCashierProductionCollectionFact(
      {
        ...COMMIT,
        terminalId: "22222222-2222-4222-8222-222222222222",
      },
      store
    );
    const actorRetry = await commitCashierProductionCollectionFact(
      { ...COMMIT, actorUserId: 99 },
      store
    );
    expect(terminalRetry.outcome).toBe("replayed");
    expect(actorRetry.outcome).toBe("replayed");
    expect(terminalRetry.fact.collectionFactId).toBe(first.fact.collectionFactId);
    expect(terminalRetry.fact.terminalId).toBe(COMMIT.terminalId);
    expect(actorRetry.fact.actorId).toBe("7");
    expect(store.snapshot()).toHaveLength(1);
  });

  it("rejects missing or invalid production terminal and actor on commit", async () => {
    const store = new InMemoryCollectionFactStore();
    await expect(
      commitCashierProductionCollectionFact({ ...COMMIT, terminalId: "" }, store)
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      commitCashierProductionCollectionFact({ ...COMMIT, actorType: "" }, store)
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      commitCashierProductionCollectionFact({ ...COMMIT, actorUserId: 0 }, store)
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect(store.snapshot()).toHaveLength(0);
  });

  it("rejects a missing paymentIntentId and a non-cashier_pos freeze", async () => {
    const store = new InMemoryCollectionFactStore();
    await expect(
      commitCashierProductionCollectionFact(
        { ...COMMIT, paymentIntentId: "" },
        store
      )
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      commitCashierProductionCollectionFact(
        {
          ...COMMIT,
          freeze: { ...FREEZE, orderingChannel: "kiosk" },
        },
        store
      )
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect(store.snapshot()).toHaveLength(0);
  });

  it("preserves the authoritative freeze snapshots including discount, currency, tenders, and composition", async () => {
    const freeze: CashierPaidMoneyFreeze = {
      ...FREEZE,
      discountAmount: "4.00",
      taxAmount: "14.40",
      grandTotal: "110.40",
      taxBreakdown: {
        lines: [
          {
            componentId: "vat",
            name: "VAT",
            ratePercent: "15.00",
            amount: "14.40",
          },
        ],
        totalTaxAmount: "14.40",
      },
      tenders: [
        { paymentMethod: "cash", amount: "50.00" },
        { paymentMethod: "card", amount: "60.40" },
      ],
    };
    const store = new InMemoryCollectionFactStore();
    const created = await commitCashierProductionCollectionFact(
      { ...COMMIT, freeze },
      store
    );
    const replayed = await commitCashierProductionCollectionFact(
      { ...COMMIT, freeze },
      store
    );
    expect(created.outcome).toBe("created");
    expect(collectionFactCommitIsPaid(replayed.outcome)).toBe(true);
    expect(replayed.fact.discountAmount).toBe("4.00");
    expect(replayed.fact.currencySnapshot).toEqual(FREEZE.currencySnapshot);
    expect(replayed.fact.taxPolicySnapshot).toEqual(FREEZE.taxPolicySnapshot);
    expect(replayed.fact.tenders).toEqual(freeze.tenders);
    expect(replayed.fact.composition).toEqual(FREEZE.composition);
    expect(replayed.fact.amount).toBe("110.40");
  });

  it("keeps the committed fact after a simulated downstream failure and recovers the same fact on retry", async () => {
    const inner = new InMemoryCollectionFactStore();
    const { store, insertCount } = countingStore(inner);
    const first = await commitCashierProductionCollectionFact(COMMIT, store);
    expect(collectionFactCommitIsPaid(first.outcome)).toBe(true);
    const frozen = structuredClone(inner.snapshot()[0]);
    const downstream = new Error("ST write failed after Collection Fact commit");
    expect(downstream.message).toContain("ST write failed");
    expect(inner.snapshot()).toHaveLength(1);
    expect(inner.snapshot()[0]).toEqual(frozen);
    const recovered = await commitCashierProductionCollectionFact(COMMIT, store);
    expect(recovered.outcome).toBe("replayed");
    expect(recovered.fact.collectionFactId).toBe(first.fact.collectionFactId);
    expect(inner.snapshot()[0]).toEqual(frozen);
    expect(insertCount()).toBe(1);
  });
});
