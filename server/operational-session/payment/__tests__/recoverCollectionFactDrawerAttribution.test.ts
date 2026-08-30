/**
 * DRAWER-ATTRIBUTION-RELIABILITY-1 — durable CF Drawer attribution replay.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CollectionFact } from "@shared/operational-session/payment/collection-fact";

const mocks = vi.hoisted(() => ({
  listProductionCollectionFactsAwaitingDrawerAttribution: vi.fn(),
  resolveSettlementContextForCollectionFact: vi.fn(),
  adoptSettlementAttributionAfterFinalize: vi.fn(),
}));

vi.mock("../collection-fact/collectionFactRepository", () => ({
  listProductionCollectionFactsAwaitingDrawerAttribution: (...a: unknown[]) =>
    mocks.listProductionCollectionFactsAwaitingDrawerAttribution(...a),
}));

vi.mock("../../../crmp/SettlementContextResolver", () => ({
  resolveSettlementContextForCollectionFact: (...a: unknown[]) =>
    mocks.resolveSettlementContextForCollectionFact(...a),
}));

vi.mock("../../check/checkSettlementAttributionAdoption", () => ({
  adoptSettlementAttributionAfterFinalize: (...a: unknown[]) =>
    mocks.adoptSettlementAttributionAfterFinalize(...a),
}));

vi.mock("../../../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

import { recoverCollectionFactDrawerAttributions } from "../recoverCollectionFactDrawerAttribution";

function fact(overrides: Partial<CollectionFact> = {}): CollectionFact {
  return {
    collectionFactId: "cf-1",
    restaurantId: 1,
    orderId: 55,
    paymentIntentId: "pi-1",
    orderingChannel: "cashier_pos",
    kind: "collection",
    purpose: "production",
    schemaVersion: 1,
    subtotal: "80.00",
    discountAmount: "0.00",
    taxAmount: "12.00",
    amount: "92.00",
    currencyCode: "SAR",
    currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
    taxPolicySnapshot: {
      version: 1,
      enabled: true,
      mode: "exclusive",
      components: [],
    },
    taxBreakdown: { totalTaxAmount: "12.00", lines: [] },
    composition: [],
    tenders: [{ paymentMethod: "cash", amount: "92.00" }],
    checkId: 10,
    actorType: "user",
    actorId: "7",
    terminalId: "term-1",
    businessDay: "2026-08-27",
    idempotencyKey: "idem-1",
    fingerprint: "fp-1",
    committedAt: "2026-08-27T12:00:00.000Z",
    createdAt: "2026-08-27T12:00:00.000Z",
    ...overrides,
  };
}

describe("recoverCollectionFactDrawerAttributions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveSettlementContextForCollectionFact.mockResolvedValue({
      restaurantId: 1,
      registerId: "reg_1",
      financialShiftId: "fsh_1",
      operatorUserId: 7,
      deviceId: "term-1",
      status: "resolved",
      gaps: [],
    });
    mocks.adoptSettlementAttributionAfterFinalize.mockResolvedValue({
      attribution: { outcome: "created", gaps: [] },
      events: [],
    });
  });

  it("replays missing CF attribution without requiring a Settlement Record", async () => {
    mocks.listProductionCollectionFactsAwaitingDrawerAttribution.mockResolvedValue(
      [fact()]
    );
    const result = await recoverCollectionFactDrawerAttributions(25);
    expect(result).toEqual({ attempted: 1, failed: 0, created: 1 });
    expect(mocks.resolveSettlementContextForCollectionFact).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: 1,
        deviceId: "term-1",
        operatorUserId: 7,
        committedAt: "2026-08-27T12:00:00.000Z",
      })
    );
    expect(mocks.adoptSettlementAttributionAfterFinalize).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: 1,
        settlementRecord: null,
        collectionFact: expect.objectContaining({
          collectionFactId: "cf-1",
          orderId: 55,
          amount: "92.00",
          committedAt: "2026-08-27T12:00:00.000Z",
        }),
      })
    );
  });

  it("idempotent replay of an already-attributed CF counts as converged", async () => {
    mocks.listProductionCollectionFactsAwaitingDrawerAttribution.mockResolvedValue(
      [fact()]
    );
    mocks.adoptSettlementAttributionAfterFinalize.mockResolvedValue({
      attribution: { outcome: "already_applied", gaps: [] },
      events: [],
    });
    const result = await recoverCollectionFactDrawerAttributions(25);
    expect(result).toEqual({ attempted: 1, failed: 0, created: 1 });
  });

  it("does not treat a skipped context as Financial Core failure", async () => {
    mocks.listProductionCollectionFactsAwaitingDrawerAttribution.mockResolvedValue(
      [fact()]
    );
    mocks.adoptSettlementAttributionAfterFinalize.mockResolvedValue({
      attribution: {
        outcome: "skipped",
        gaps: ["financial_shift_unavailable"],
      },
      events: [],
    });
    const result = await recoverCollectionFactDrawerAttributions(25);
    expect(result).toEqual({ attempted: 1, failed: 0, created: 0 });
  });

  it("isolates a failed replay and continues the batch", async () => {
    mocks.listProductionCollectionFactsAwaitingDrawerAttribution.mockResolvedValue(
      [fact({ collectionFactId: "cf-a", orderId: 1 }), fact({ collectionFactId: "cf-b", orderId: 2 })]
    );
    mocks.adoptSettlementAttributionAfterFinalize
      .mockResolvedValueOnce({
        attribution: { outcome: "failed", gaps: ["attribution_create_failed"] },
        events: [],
      })
      .mockResolvedValueOnce({
        attribution: { outcome: "created", gaps: [] },
        events: [],
      });
    const result = await recoverCollectionFactDrawerAttributions(25);
    expect(result).toEqual({ attempted: 2, failed: 1, created: 1 });
  });
});
