/**
 * PRODUCTION-COLLECTION-FACT-COMMIT-CONTRACT-1 — writer contract tests.
 * In-memory store only. Does not call Cashier, Confirm, Revenue, Settlement, or production DB.
 */
import { describe, expect, it, vi } from "vitest";
import {
  ORDERING_CHANNEL_CASHIER_POS,
  ORDERING_CHANNEL_WAITER_TABLET,
} from "@shared/ordering-platform";
import {
  COLLECTION_FACT_FINALITY,
  CollectionFactError,
  collectionFactCommitIsPaid,
  committedFactIsAuthoritative,
  deriveShadowCollectionFactCommand,
  type CollectionFactCommitContext,
  type CollectionFactFreezeSource,
  type CommitCollectionFactCommand,
} from "@shared/operational-session/payment/collection-fact";
import { commitCollectionFact } from "../CollectionFactService";
import { InMemoryCollectionFactStore } from "../InMemoryCollectionFactStore";
import {
  deleteCollectionFact,
  updateCollectionFact,
} from "../collectionFactRepository";

vi.mock("../../../../_core/opsLog", () => ({
  opsLog: () => undefined,
}));

const AUTHORIZED: CollectionFactCommitContext = {
  restaurantId: 7,
  actorAuthorized: true,
  actorUserId: 42,
  actorType: "cashier",
  terminalId: "term-1",
};

function freezeSource(
  overrides: Partial<CollectionFactFreezeSource> = {}
): CollectionFactFreezeSource {
  return {
    restaurantId: 7,
    orderId: 1001,
    paymentIntentId: "intent-prod-1001-a",
    orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
    purpose: "production",
    subtotal: "100.00",
    discountAmount: "0.00",
    taxAmount: "15.00",
    amount: "115.00",
    currencyCode: "SAR",
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
    composition: [
      {
        sequence: 1,
        description: "Kabsa",
        netAmount: "100.00",
        taxAmount: "15.00",
        originOrderId: 1001,
      },
    ],
    tenders: [{ paymentMethod: "cash", amount: "115.00" }],
    checkId: 55,
    businessDay: "2026-08-20",
    idempotencyKey: "idem-prod-1001-a-0001",
    ...overrides,
  };
}

function command(
  overrides: Partial<CommitCollectionFactCommand> = {}
): CommitCollectionFactCommand {
  return deriveShadowCollectionFactCommand(freezeSource(overrides));
}

async function commit(
  store: InMemoryCollectionFactStore,
  cmd: CommitCollectionFactCommand = command(),
  context: CollectionFactCommitContext = AUTHORIZED
) {
  return commitCollectionFact({ context, command: cmd }, store);
}

describe("production Collection Fact commit", () => {
  it("A commits a valid production fact as COMMITTED = PAID with no second write", async () => {
    const store = new InMemoryCollectionFactStore();
    const result = await commit(store);
    expect(result.outcome).toBe("created");
    expect(collectionFactCommitIsPaid(result.outcome)).toBe(true);
    expect(committedFactIsAuthoritative(result.fact)).toBe(true);
    expect(result.fact.purpose).toBe("production");
    expect(result.fact.kind).toBe("collection");
    expect(result.fact.amount).toBe("115.00");
    expect(result.fact.currencyCode).toBe("SAR");
    expect(result.fact.taxAmount).toBe("15.00");
    expect(result.fact.discountAmount).toBe("0.00");
    expect(result.fact.terminalId).toBe("term-1");
    expect(result.fact.actorId).toBe("42");
    expect(result.fact.businessDay).toBe("2026-08-20");
    expect(result.fact.paymentIntentId).toBe("intent-prod-1001-a");
    expect(result.fact.idempotencyKey).toBe("idem-prod-1001-a-0001");
    expect(result.fact.collectionFactId).toMatch(/^pcf_/);
    expect(result.fact.checkId).toBe(55);
    expect(COLLECTION_FACT_FINALITY.paid).toContain("same committed fact");
    expect(store.snapshot()).toHaveLength(1);
  });

  it("B C D E F G H I reject invalid production commits before insert", async () => {
    const store = new InMemoryCollectionFactStore();
    await expect(
      commit(
        store,
        command({
          amount: "0.00",
          tenders: [{ paymentMethod: "cash", amount: "0.00" }],
        })
      )
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      commit(
        store,
        command({
          currencySnapshot: { currencyCode: "USD", currencySymbol: "$" },
        })
      )
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(commit(store, command({ orderId: 0 }))).rejects.toMatchObject({
      code: "VALIDATION",
    });
    await expect(
      commitCollectionFact(
        { context: AUTHORIZED, command: command({ restaurantId: 99 }) },
        store
      )
    ).rejects.toMatchObject({ code: "TENANT" });
    await expect(
      commit(store, command(), { ...AUTHORIZED, terminalId: null })
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      commit(store, command({ businessDay: "2026/08/20" }))
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      commit(store, command({ paymentIntentId: "" }))
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      commit(store, command({ idempotencyKey: "nope" }))
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      commit(
        store,
        command(),
        { ...AUTHORIZED, actorUserId: null, actorType: "cashier" }
      )
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect(store.snapshot()).toHaveLength(0);
  });

  it("F isolated purposes may omit terminal; production may not", async () => {
    const store = new InMemoryCollectionFactStore();
    const isolated = await commit(
      store,
      command({
        purpose: "test",
        paymentIntentId: "intent-isolated-1",
        idempotencyKey: "idem-isolated-0001",
      }),
      { ...AUTHORIZED, terminalId: null, actorUserId: null, actorType: null }
    );
    expect(isolated.fact.purpose).toBe("test");
    expect(isolated.fact.terminalId).toBeNull();
    await expect(
      commit(store, command(), { ...AUTHORIZED, terminalId: null })
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("J K L retry returns the same fact; duplicate intent/key conflict", async () => {
    const store = new InMemoryCollectionFactStore();
    const first = await commit(store);
    const retry = await commit(store);
    expect(retry.outcome).toBe("replayed");
    expect(collectionFactCommitIsPaid(retry.outcome)).toBe(true);
    expect(retry.fact.collectionFactId).toBe(first.fact.collectionFactId);
    expect(retry.fact.amount).toBe(first.fact.amount);
    expect(store.snapshot()).toHaveLength(1);
    await expect(
      commit(store, command({ idempotencyKey: "idem-prod-1001-a-other" }))
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      commit(
        store,
        command({
          amount: "200.00",
          tenders: [{ paymentMethod: "cash", amount: "200.00" }],
        })
      )
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(store.snapshot()).toHaveLength(1);
  });

  it("M a different payment does not collapse into the existing fact", async () => {
    const store = new InMemoryCollectionFactStore();
    const first = await commit(store);
    const second = await commit(
      store,
      command({
        paymentIntentId: "intent-prod-1001-b",
        idempotencyKey: "idem-prod-1001-b-0001",
      })
    );
    expect(second.outcome).toBe("created");
    expect(second.fact.collectionFactId).not.toBe(first.fact.collectionFactId);
    expect(store.snapshot()).toHaveLength(2);
  });

  it("X the same contract commits a non-Cashier channel", async () => {
    const store = new InMemoryCollectionFactStore();
    const result = await commit(
      store,
      command({
        orderingChannel: ORDERING_CHANNEL_WAITER_TABLET,
        paymentIntentId: "intent-waiter-1",
        idempotencyKey: "idem-waiter-0001",
      }),
      { ...AUTHORIZED, actorType: "waiter" }
    );
    expect(result.fact.orderingChannel).toBe(ORDERING_CHANNEL_WAITER_TABLET);
    expect(result.fact.purpose).toBe("production");
  });

  it("N immutable fields cannot be changed after commit", async () => {
    const store = new InMemoryCollectionFactStore();
    const result = await commit(store);
    expect(() => updateCollectionFact()).toThrow(CollectionFactError);
    expect(() => deleteCollectionFact()).toThrow(CollectionFactError);
    try {
      updateCollectionFact();
    } catch (error) {
      expect(error).toMatchObject({ code: "IMMUTABLE" });
    }
    expect(store.snapshot()[0]?.amount).toBe(result.fact.amount);
    expect(store.snapshot()[0]?.currencyCode).toBe(result.fact.currencyCode);
    expect(store.snapshot()[0]?.tenders).toEqual(result.fact.tenders);
  });

  it("O committed fact does not reread mutable Check state", async () => {
    const store = new InMemoryCollectionFactStore();
    const result = await commit(store);
    const mutableCheck = { id: 55, grandTotal: "115.00", outcome: "open" };
    mutableCheck.grandTotal = "999.00";
    mutableCheck.outcome = "void";
    const stored = store.snapshot()[0];
    expect(stored?.checkId).toBe(55);
    expect(stored?.amount).toBe("115.00");
    expect(stored?.amount).not.toBe(mutableCheck.grandTotal);
    expect(stored?.fingerprint).toBe(result.fact.fingerprint);
  });

  it("P Q COMMITTED and PAID are one financial outcome, not a second authority", async () => {
    const store = new InMemoryCollectionFactStore();
    const created = await commit(store);
    const replayed = await commit(store);
    expect(collectionFactCommitIsPaid(created.outcome)).toBe(true);
    expect(collectionFactCommitIsPaid(replayed.outcome)).toBe(true);
    expect(created.fact.collectionFactId).toBe(replayed.fact.collectionFactId);
    expect(store.snapshot()).toHaveLength(1);
    expect(created.fact.kind).toBe("collection");
  });

  it("R downstream ST/OS/SR failure does not invalidate the committed fact", async () => {
    const store = new InMemoryCollectionFactStore();
    const result = await commit(store);
    function publishSettlement(): never {
      throw new Error("SR failed after Collection Commit");
    }
    expect(() => publishSettlement()).toThrow("SR failed");
    expect(() => updateCollectionFact()).toThrow(CollectionFactError);
    expect(() => deleteCollectionFact()).toThrow(CollectionFactError);
    const surviving = await store.findByFactId({
      restaurantId: 7,
      collectionFactId: result.fact.collectionFactId,
    });
    expect(surviving?.amount).toBe("115.00");
    expect(surviving?.purpose).toBe("production");
    expect(surviving?.fingerprint).toBe(result.fact.fingerprint);
  });

  it("retry after a lost HTTP response keeps the original terminal attribution", async () => {
    const store = new InMemoryCollectionFactStore();
    const first = await commit(store);
    const retry = await commit(store, command(), {
      ...AUTHORIZED,
      terminalId: "term-other",
    });
    expect(retry.outcome).toBe("replayed");
    expect(retry.fact.terminalId).toBe("term-1");
    expect(retry.fact.collectionFactId).toBe(first.fact.collectionFactId);
  });
});
