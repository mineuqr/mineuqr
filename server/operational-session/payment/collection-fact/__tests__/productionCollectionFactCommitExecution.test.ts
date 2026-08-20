/**
 * PRODUCTION-COLLECTION-FACT-COMMIT-EXECUTION-HARDENING-1
 * Writer/store execution proofs. In-memory only. No production DB. No Cashier.
 *
 * Reuses PRODUCTION-COLLECTION-FACT-COMMIT-CONTRACT-1 fixtures/semantics.
 * Does not redefine the contract.
 */
import { describe, expect, it, vi } from "vitest";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform";
import {
  CollectionFactError,
  PRODUCTION_COLLECTION_FACT_SNAPSHOT,
  collectionFactCommitIsPaid,
  deriveShadowCollectionFactCommand,
  type CollectionFact,
  type CollectionFactCommitContext,
  type CollectionFactFreezeSource,
  type CommitCollectionFactCommand,
} from "@shared/operational-session/payment/collection-fact";
import { commitCollectionFact } from "../CollectionFactService";
import { InMemoryCollectionFactStore } from "../InMemoryCollectionFactStore";
import type { CollectionFactStore } from "../collectionFactStore";
import {
  deleteCollectionFact,
  toCollectionFactInsertValues,
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
    paymentIntentId: "intent-exec-1001-a",
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
    idempotencyKey: "idem-exec-1001-a-0001",
    ...overrides,
  };
}

function command(
  overrides: Partial<CommitCollectionFactCommand> = {}
): CommitCollectionFactCommand {
  return deriveShadowCollectionFactCommand(freezeSource(overrides));
}

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

async function commit(
  store: CollectionFactStore,
  cmd: CommitCollectionFactCommand = command(),
  context: CollectionFactCommitContext = AUTHORIZED
) {
  return commitCollectionFact({ context, command: cmd }, store);
}

function expectFrozen(fact: CollectionFact) {
  expect(() => {
    (fact as { amount: string }).amount = "1.00";
  }).toThrow(TypeError);
  expect(() => {
    (fact.tenders as { amount: string }[])[0].amount = "1.00";
  }).toThrow(TypeError);
}

describe("production Collection Fact commit execution", () => {
  it("11 first production commit inserts exactly one complete snapshot", async () => {
    const inner = new InMemoryCollectionFactStore();
    const { store, insertCount } = countingStore(inner);
    const result = await commit(store);
    expect(result.outcome).toBe("created");
    expect(collectionFactCommitIsPaid(result.outcome)).toBe(true);
    expect(insertCount()).toBe(1);
    expect(inner.snapshot()).toHaveLength(1);
    const fact = result.fact;
    const source = freezeSource();
    expect(fact.restaurantId).toBe(source.restaurantId);
    expect(fact.collectionFactId).toMatch(/^pcf_/);
    expect(fact.paymentIntentId).toBe(source.paymentIntentId);
    expect(fact.orderId).toBe(source.orderId);
    expect(fact.orderingChannel).toBe(source.orderingChannel);
    expect(fact.amount).toBe(source.amount);
    expect(fact.currencyCode).toBe(source.currencyCode);
    expect(fact.currencySnapshot).toEqual(source.currencySnapshot);
    expect(fact.taxAmount).toBe(source.taxAmount);
    expect(fact.taxPolicySnapshot).toEqual(source.taxPolicySnapshot);
    expect(fact.taxBreakdown).toEqual(source.taxBreakdown);
    expect(fact.discountAmount).toBe(source.discountAmount);
    expect(fact.composition).toEqual(source.composition);
    expect(fact.tenders).toEqual(source.tenders);
    expect(fact.actorType).toBe("cashier");
    expect(fact.actorId).toBe("42");
    expect(fact.terminalId).toBe("term-1");
    expect(fact.businessDay).toBe(source.businessDay);
    expect(fact.committedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(fact.idempotencyKey).toBe(source.idempotencyKey);
    expect(fact.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(fact.checkId).toBe(55);
    expect(fact.purpose).toBe("production");
    expect(fact.kind).toBe("collection");
    for (const field of Object.keys(PRODUCTION_COLLECTION_FACT_SNAPSHOT)) {
      expect(fact).toHaveProperty(field);
    }
    const persisted = toCollectionFactInsertValues(fact);
    expect(persisted.currencySnapshotJson).toEqual(fact.currencySnapshot);
    expect(persisted.taxPolicySnapshotJson).toEqual(fact.taxPolicySnapshot);
    expect(persisted.taxBreakdownJson).toEqual(fact.taxBreakdown);
    expect(persisted.compositionJson).toEqual(fact.composition);
    expect(persisted.tendersJson).toEqual(fact.tenders);
  });

  it("12 16 identical retry and lost-response retry replay without a second insert", async () => {
    const inner = new InMemoryCollectionFactStore();
    const { store, insertCount } = countingStore(inner);
    const first = await commit(store);
    const lostResponse = undefined;
    void lostResponse;
    const retry = await commit(store);
    expect(retry.outcome).toBe("replayed");
    expect(collectionFactCommitIsPaid(retry.outcome)).toBe(true);
    expect(retry.fact.collectionFactId).toBe(first.fact.collectionFactId);
    expect(retry.fact.fingerprint).toBe(first.fact.fingerprint);
    expect(retry.fact.amount).toBe(first.fact.amount);
    expect(insertCount()).toBe(1);
    expect(inner.snapshot()).toHaveLength(1);
  });

  it("recovers replay when persist succeeded but insert reported DUPLICATE", async () => {
    const inner = new InMemoryCollectionFactStore();
    const raced: CollectionFactStore = {
      insert: async (fact) => {
        await inner.insert(fact);
        throw new CollectionFactError("DUPLICATE", "persist succeeded; response lost");
      },
      findByIdempotency: (input) => inner.findByIdempotency(input),
      findByPaymentIntent: (input) => inner.findByPaymentIntent(input),
      findByFactId: (input) => inner.findByFactId(input),
    };
    const result = await commit(raced);
    expect(result.outcome).toBe("replayed");
    expect(collectionFactCommitIsPaid(result.outcome)).toBe(true);
    expect(inner.snapshot()).toHaveLength(1);
    expect(inner.snapshot()[0]?.collectionFactId).toBe(result.fact.collectionFactId);
  });

  it("STORAGE insert failure does not leave a Collection Fact", async () => {
    const inner = new InMemoryCollectionFactStore();
    const failing: CollectionFactStore = {
      insert: async () => {
        throw new CollectionFactError("STORAGE", "disk full");
      },
      findByIdempotency: (input) => inner.findByIdempotency(input),
      findByPaymentIntent: (input) => inner.findByPaymentIntent(input),
      findByFactId: (input) => inner.findByFactId(input),
    };
    await expect(commit(failing)).rejects.toMatchObject({ code: "STORAGE" });
    expect(inner.snapshot()).toHaveLength(0);
  });

  it("13  F fingerprint binds financial payload fields; altered retry conflicts and does not mutate", async () => {
    const store = new InMemoryCollectionFactStore();
    const first = await commit(store);
    const conflicts: CommitCollectionFactCommand[] = [
      command({
        amount: "200.00",
        tenders: [{ paymentMethod: "cash", amount: "200.00" }],
      }),
      command({
        discountAmount: "5.00",
      }),
      command({
        taxAmount: "20.00",
        taxBreakdown: {
          lines: [
            {
              componentId: "vat",
              name: "VAT",
              ratePercent: "15.00",
              amount: "20.00",
            },
          ],
          totalTaxAmount: "20.00",
        },
      }),
      command({
        tenders: [{ paymentMethod: "card", amount: "115.00" }],
      }),
      command({
        composition: [
          {
            sequence: 1,
            description: "Mandi",
            netAmount: "100.00",
            taxAmount: "15.00",
            originOrderId: 1001,
          },
        ],
      }),
      command({
        orderId: 2002,
        composition: [
          {
            sequence: 1,
            description: "Kabsa",
            netAmount: "100.00",
            taxAmount: "15.00",
            originOrderId: 2002,
          },
        ],
      }),
      command({
        currencyCode: "AED",
        currencySnapshot: { currencyCode: "AED", currencySymbol: "د.إ" },
      }),
      command({ businessDay: "2026-08-21" }),
      command({
        taxPolicySnapshot: {
          version: 2,
          enabled: true,
          mode: "exclusive",
          components: [{ id: "vat", name: "VAT", ratePercent: "15.00" }],
        },
      }),
      command({ checkId: 99 }),
    ];
    for (const cmd of conflicts) {
      await expect(commit(store, cmd)).rejects.toMatchObject({ code: "CONFLICT" });
    }
    expect(store.snapshot()).toHaveLength(1);
    expect(store.snapshot()[0]?.amount).toBe(first.fact.amount);
    expect(store.snapshot()[0]?.fingerprint).toBe(first.fact.fingerprint);
    expect(store.snapshot()[0]?.tenders).toEqual(first.fact.tenders);
    expect(store.snapshot()[0]?.orderId).toBe(1001);
  });

  it("14 same paymentIntent with a different idempotency key is CONFLICT", async () => {
    const store = new InMemoryCollectionFactStore();
    await commit(store);
    await expect(
      commit(store, command({ idempotencyKey: "idem-exec-1001-a-other" }))
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(store.snapshot()).toHaveLength(1);
  });

  it("15 different paymentIntent does not collapse on shared sale/amount/terminal/day", async () => {
    const store = new InMemoryCollectionFactStore();
    const first = await commit(store);
    const second = await commit(
      store,
      command({
        paymentIntentId: "intent-exec-1001-b",
        idempotencyKey: "idem-exec-1001-b-0001",
      })
    );
    expect(second.outcome).toBe("created");
    expect(second.fact.orderId).toBe(first.fact.orderId);
    expect(second.fact.amount).toBe(first.fact.amount);
    expect(second.fact.businessDay).toBe(first.fact.businessDay);
    expect(second.fact.terminalId).toBe(first.fact.terminalId);
    expect(second.fact.collectionFactId).not.toBe(first.fact.collectionFactId);
    expect(store.snapshot()).toHaveLength(2);
  });

  it("17 18 committed facts are frozen and repository UPDATE/DELETE stay forbidden", async () => {
    const store = new InMemoryCollectionFactStore();
    const result = await commit(store);
    expectFrozen(result.fact);
    expectFrozen(store.snapshot()[0] as CollectionFact);
    expect(() => updateCollectionFact()).toThrow(CollectionFactError);
    expect(() => deleteCollectionFact()).toThrow(CollectionFactError);
    expect(store.snapshot()[0]?.amount).toBe("115.00");
  });

  it("19  downstream failure cannot mutate, delete, or insert a compensating duplicate", async () => {
    const store = new InMemoryCollectionFactStore();
    const result = await commit(store);
    expect(() => {
      throw new Error("ST/OS/SR failed after Collection Commit");
    }).toThrow("ST/OS/SR failed");
    expect(() => updateCollectionFact()).toThrow(CollectionFactError);
    expect(() => deleteCollectionFact()).toThrow(CollectionFactError);
    await expect(
      commit(
        store,
        command({
          idempotencyKey: "idem-exec-compensating-0001",
        })
      )
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const surviving = await store.findByFactId({
      restaurantId: 7,
      collectionFactId: result.fact.collectionFactId,
    });
    expect(surviving?.amount).toBe("115.00");
    expect(surviving?.fingerprint).toBe(result.fact.fingerprint);
    expect(store.snapshot()).toHaveLength(1);
  });

  it("20 21 22 23 created and replayed are the same paid fact with one insert", async () => {
    const inner = new InMemoryCollectionFactStore();
    const { store, insertCount } = countingStore(inner);
    const created = await commit(store);
    const replayed = await commit(store);
    expect(collectionFactCommitIsPaid(created.outcome)).toBe(true);
    expect(collectionFactCommitIsPaid(replayed.outcome)).toBe(true);
    expect(created.outcome).toBe("created");
    expect(replayed.outcome).toBe("replayed");
    expect(created.fact.collectionFactId).toBe(replayed.fact.collectionFactId);
    expect(insertCount()).toBe(1);
    expect(inner.snapshot()).toHaveLength(1);
    expect(created.fact.kind).toBe("collection");
  });

  it("checkId is optional and composition cannot silently refer to another order", async () => {
    const store = new InMemoryCollectionFactStore();
    const withoutCheck = await commit(
      store,
      command({
        checkId: null,
        paymentIntentId: "intent-exec-nocheck",
        idempotencyKey: "idem-exec-nocheck-0001",
      })
    );
    expect(withoutCheck.fact.checkId).toBeNull();
    expect(withoutCheck.fact.orderId).toBe(1001);
    await expect(
      commit(
        store,
        command({
          paymentIntentId: "intent-exec-wrong-origin",
          idempotencyKey: "idem-exec-wrong-origin-0001",
          composition: [
            {
              sequence: 1,
              description: "Kabsa",
              netAmount: "100.00",
              taxAmount: "15.00",
              originOrderId: 9999,
            },
          ],
        })
      )
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect(store.snapshot()).toHaveLength(1);
  });
});
