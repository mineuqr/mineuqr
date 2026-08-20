/**
 * PAYMENT-COLLECTION-FACT-IMPLEMENTATION-1 — Collection Fact writer tests.
 * Controlled harness only. Does not call Cashier, Confirm, Revenue, or Settlement.
 */
import { describe, expect, it, vi } from "vitest";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform";
import {
  CollectionFactError,
  compareCollectionFactToFreeze,
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
import { OPS_EVENT } from "../../../../_core/opsTaxonomy";

const mocks = vi.hoisted(() => ({
  opsLog: vi.fn(),
}));

vi.mock("../../../../_core/opsLog", () => ({
  opsLog: (...a: unknown[]) => mocks.opsLog(...a),
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
    paymentIntentId: "intent-1001-a",
    orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
    purpose: "test",
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
    checkId: null,
    businessDay: "2026-08-20",
    idempotencyKey: "idem-1001-a-0001",
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

describe("commitCollectionFact", () => {
  it("creates a unique tenant-scoped Collection Fact with frozen money and tenders", async () => {
    const store = new InMemoryCollectionFactStore();
    const result = await commit(store);
    expect(result.outcome).toBe("created");
    expect(result.fact.collectionFactId).toMatch(/^pcf_/);
    expect(result.fact.restaurantId).toBe(7);
    expect(result.fact.orderId).toBe(1001);
    expect(result.fact.amount).toBe("115.00");
    expect(result.fact.currencyCode).toBe("SAR");
    expect(result.fact.taxAmount).toBe("15.00");
    expect(result.fact.discountAmount).toBe("0.00");
    expect(result.fact.tenders).toEqual([{ paymentMethod: "cash", amount: "115.00" }]);
    expect(result.fact.purpose).toBe("test");
    expect(result.fact.kind).toBe("collection");
    expect(result.fact.checkId).toBeNull();
    expect(mocks.opsLog).toHaveBeenCalledWith(
      expect.objectContaining({
        type: OPS_EVENT.payment_collection_fact_committed,
        category: "PAYMENT",
      })
    );
  });

  it("replays an identical retry and a lost-response repeat without creating a second fact", async () => {
    const store = new InMemoryCollectionFactStore();
    const first = await commit(store);
    const retry = await commit(store);
    const lostResponse = await commit(store);
    expect(retry.outcome).toBe("replayed");
    expect(lostResponse.outcome).toBe("replayed");
    expect(retry.fact.collectionFactId).toBe(first.fact.collectionFactId);
    expect(lostResponse.fact.collectionFactId).toBe(first.fact.collectionFactId);
    expect(store.snapshot()).toHaveLength(1);
  });

  it("allows the same sale with a different payment intent and idempotency key", async () => {
    const store = new InMemoryCollectionFactStore();
    const first = await commit(store, command());
    const second = await commit(
      store,
      command({
        paymentIntentId: "intent-1001-b",
        idempotencyKey: "idem-1001-b-0001",
      })
    );
    expect(first.outcome).toBe("created");
    expect(second.outcome).toBe("created");
    expect(second.fact.collectionFactId).not.toBe(first.fact.collectionFactId);
    expect(store.snapshot()).toHaveLength(2);
  });

  it("rejects a second idempotency key for the same payment intent", async () => {
    const store = new InMemoryCollectionFactStore();
    await commit(store, command());
    await expect(
      commit(store, command({ idempotencyKey: "idem-1001-a-other" }))
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(store.snapshot()).toHaveLength(1);
  });

  it("rejects a conflicting payload on the same idempotency key", async () => {
    const store = new InMemoryCollectionFactStore();
    await commit(store, command());
    await expect(
      commit(store, command({ amount: "200.00", tenders: [{ paymentMethod: "cash", amount: "200.00" }] }))
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(store.snapshot()).toHaveLength(1);
  });

  it("serializes concurrent commits for the same intent into one fact", async () => {
    const store = new InMemoryCollectionFactStore();
    const cmd = command();
    const [a, b] = await Promise.all([commit(store, cmd), commit(store, cmd)]);
    const ids = new Set([a.fact.collectionFactId, b.fact.collectionFactId]);
    expect(ids.size).toBe(1);
    expect(
      [a.outcome, b.outcome].filter((outcome) => outcome === "created")
    ).toHaveLength(1);
    expect(store.snapshot()).toHaveLength(1);
  });

  it("isolates tenants on idempotency identity", async () => {
    const store = new InMemoryCollectionFactStore();
    const first = await commit(store, command());
    const otherTenant = await commitCollectionFact(
      {
        context: { ...AUTHORIZED, restaurantId: 8 },
        command: command({ restaurantId: 8 }),
      },
      store
    );
    expect(otherTenant.outcome).toBe("created");
    expect(otherTenant.fact.collectionFactId).not.toBe(first.fact.collectionFactId);
    expect(
      await store.findByIdempotency({ restaurantId: 8, idempotencyKey: first.fact.idempotencyKey })
    ).toEqual(otherTenant.fact);
    expect(
      await store.findByFactId({
        restaurantId: 8,
        collectionFactId: first.fact.collectionFactId,
      })
    ).toBeNull();
  });

  it("rejects unauthorized actors, wrong tenant, invalid terminal, and invalid commands", async () => {
    const store = new InMemoryCollectionFactStore();
    await expect(
      commit(store, command(), { ...AUTHORIZED, actorAuthorized: false })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      commitCollectionFact(
        {
          context: AUTHORIZED,
          command: command({ restaurantId: 99 }),
        },
        store
      )
    ).rejects.toMatchObject({ code: "TENANT" });
    await expect(
      commit(store, command(), { ...AUTHORIZED, terminalId: "   " })
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      commit(
        store,
        command({
          tenders: [{ paymentMethod: "cash", amount: "10.00" }],
        })
      )
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      commit(
        store,
        command({
          purpose: "production" as CommitCollectionFactCommand["purpose"],
        })
      )
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect(store.snapshot()).toHaveLength(0);
  });

  it("does not mutate Check, PAID, Revenue, or Settlement through the writer", async () => {
    const store = new InMemoryCollectionFactStore();
    await commit(store);
    expect(store.snapshot()).toHaveLength(1);
    expect(store.snapshot()[0]?.purpose).toBe("test");
  });

  it("writes a shadow fact and compares freeze fields without publishing Revenue", async () => {
    const store = new InMemoryCollectionFactStore();
    const source = freezeSource({ purpose: "shadow", idempotencyKey: "idem-shadow-0001" });
    const result = await commit(store, deriveShadowCollectionFactCommand(source));
    expect(result.fact.purpose).toBe("shadow");
    expect(compareCollectionFactToFreeze(result.fact, source)).toEqual([]);
    expect(
      compareCollectionFactToFreeze(result.fact, { ...source, amount: "1.00" })
    ).toEqual([
      { field: "amount", expected: "1.00", actual: "115.00" },
    ]);
  });

  it("records isolated write duration without touching Cashier", async () => {
    const store = new InMemoryCollectionFactStore();
    const started = Date.now();
    await commit(store);
    const elapsedMs = Date.now() - started;
    expect(elapsedMs).toBeLessThan(250);
  });
});

describe("Collection Fact immutability", () => {
  it("rejects UPDATE and DELETE structurally", () => {
    expect(() => updateCollectionFact()).toThrow(CollectionFactError);
    expect(() => deleteCollectionFact()).toThrow(CollectionFactError);
    try {
      updateCollectionFact();
    } catch (error) {
      expect(error).toMatchObject({ code: "IMMUTABLE" });
    }
  });
});
