/**
 * CHECK-GENERALIZATION-M3 — membership-authoritative Check money discovery.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authoritative: true,
  dualWrite: true,
  findSessionById: vi.fn(),
  findOpenCheckBySessionId: vi.fn(),
  findCheckById: vi.fn(),
  insertOperationalCheck: vi.fn(),
  updateSessionActiveCheckId: vi.fn(),
  updateCheckMoney: vi.fn(),
  finalizeCheckOutcome: vi.fn(),
  insertSettlementTransactions: vi.fn(),
  getOrdersBySessionId: vi.fn(),
  getOrdersByIds: vi.fn(),
  getRestaurantById: vi.fn(),
  listActiveOrderIdsForCheck: vi.fn(),
  syncSessionOrdersToCheck: vi.fn(),
  deactivateMembershipsOnCheckVoid: vi.fn(),
}));

vi.mock("../../../_core/env", () => ({
  ENV: {
    get checkMembershipAuthoritativeRead() {
      return mocks.authoritative;
    },
    get checkMembershipDualWrite() {
      return mocks.dualWrite;
    },
  },
}));

vi.mock("../../../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

vi.mock("../../../db", () => ({
  getOrdersBySessionId: (...a: unknown[]) => mocks.getOrdersBySessionId(...a),
  getOrdersByIds: (...a: unknown[]) => mocks.getOrdersByIds(...a),
  getRestaurantById: (...a: unknown[]) => mocks.getRestaurantById(...a),
}));

vi.mock("../../../diningSession/sessionRepository", () => ({
  findSessionById: (...a: unknown[]) => mocks.findSessionById(...a),
  updateSessionActiveCheckId: (...a: unknown[]) =>
    mocks.updateSessionActiveCheckId(...a),
}));

vi.mock("../checkRepository", () => ({
  findOpenCheckBySessionId: (...a: unknown[]) =>
    mocks.findOpenCheckBySessionId(...a),
  findCheckById: (...a: unknown[]) => mocks.findCheckById(...a),
  insertOperationalCheck: (...a: unknown[]) => mocks.insertOperationalCheck(...a),
  updateCheckMoney: (...a: unknown[]) => mocks.updateCheckMoney(...a),
  finalizeCheckOutcome: (...a: unknown[]) => mocks.finalizeCheckOutcome(...a),
}));

vi.mock("../settlementTransactionRepository", () => ({
  insertSettlementTransactions: (...a: unknown[]) =>
    mocks.insertSettlementTransactions(...a),
}));

vi.mock("../checkMembershipService", () => ({
  syncSessionOrdersToCheck: (...a: unknown[]) =>
    mocks.syncSessionOrdersToCheck(...a),
  deactivateMembershipsOnCheckVoid: (...a: unknown[]) =>
    mocks.deactivateMembershipsOnCheckVoid(...a),
}));

vi.mock("../checkOrderMembershipRepository", () => ({
  listActiveOrderIdsForCheck: (...a: unknown[]) =>
    mocks.listActiveOrderIdsForCheck(...a),
}));

import {
  createOpenCheckForSession,
  recalculateOpenCheckForSession,
  settleCheckPaid,
  voidCheck,
} from "../CheckService";

const openCheckRow = {
  id: 100,
  restaurantId: 1,
  sessionId: 10,
  outcome: "open" as const,
  currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
  taxPolicySnapshot: {
    taxEnabled: false,
    taxMode: "exclusive" as const,
    rates: [],
  },
  subtotal: "10.00",
  taxAmount: "0.00",
  taxBreakdown: [],
  grandTotal: "10.00",
  billDiscountAmount: "0.00",
  snapshotsFrozenAt: "2026-07-22 10:00:00",
  totalsFrozenAt: null,
  settledAt: null,
  voidedAt: null,
  createdAt: "2026-07-22 10:00:00",
  updatedAt: "2026-07-22 10:00:00",
};

describe("CHECK-GENERALIZATION-M3 CheckService cutover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authoritative = true;
    mocks.dualWrite = true;
    mocks.findSessionById.mockResolvedValue({
      id: 10,
      restaurantId: 1,
      status: "open",
      activeCheckId: 100,
    });
    mocks.getRestaurantById.mockResolvedValue({
      id: 1,
      currencyCode: "SAR",
      currencySymbol: "ر.س",
    });
    mocks.syncSessionOrdersToCheck.mockResolvedValue(undefined);
    mocks.updateCheckMoney.mockResolvedValue(undefined);
  });

  it("recalculate uses membership order ids when authoritative", async () => {
    mocks.findCheckById.mockResolvedValue(openCheckRow);
    mocks.listActiveOrderIdsForCheck.mockResolvedValue([55, 56]);
    mocks.getOrdersByIds.mockResolvedValue([
      { id: 55, status: "served", totalAmount: "10.00" },
      { id: 56, status: "pending", totalAmount: "5.00" },
      { id: 56, status: "cancelled", totalAmount: "99.00" },
    ]);

    await recalculateOpenCheckForSession({ restaurantId: 1, sessionId: 10 });

    expect(mocks.listActiveOrderIdsForCheck).toHaveBeenCalledWith(1, 100);
    expect(mocks.getOrdersByIds).toHaveBeenCalledWith(1, [55, 56]);
    expect(mocks.getOrdersBySessionId).not.toHaveBeenCalled();
    expect(mocks.updateCheckMoney).toHaveBeenCalledWith(
      expect.objectContaining({
        checkId: 100,
        subtotal: "15.00",
        grandTotal: "15.00",
      })
    );
  });

  it("recalculate falls back to Session scan when authoritative flag is off", async () => {
    mocks.authoritative = false;
    mocks.findCheckById.mockResolvedValue(openCheckRow);
    mocks.getOrdersBySessionId.mockResolvedValue([
      { id: 1, status: "served", totalAmount: "20.00" },
    ]);

    await recalculateOpenCheckForSession({ restaurantId: 1, sessionId: 10 });

    expect(mocks.getOrdersBySessionId).toHaveBeenCalledWith(1, 10);
    expect(mocks.listActiveOrderIdsForCheck).not.toHaveBeenCalled();
    expect(mocks.updateCheckMoney).toHaveBeenCalledWith(
      expect.objectContaining({ subtotal: "20.00" })
    );
  });

  it("create syncs membership then refreshes money from membership", async () => {
    mocks.findSessionById.mockResolvedValue({
      id: 10,
      restaurantId: 1,
      status: "open",
      activeCheckId: null,
    });
    mocks.findOpenCheckBySessionId.mockResolvedValue(null);
    mocks.getOrdersBySessionId.mockResolvedValue([
      { id: 55, status: "pending", totalAmount: "10.00" },
    ]);
    mocks.insertOperationalCheck.mockResolvedValue(100);
    mocks.listActiveOrderIdsForCheck.mockResolvedValue([55]);
    mocks.getOrdersByIds.mockResolvedValue([
      { id: 55, status: "pending", totalAmount: "10.00" },
    ]);
    mocks.findCheckById.mockResolvedValue(openCheckRow);

    await createOpenCheckForSession({ restaurantId: 1, sessionId: 10 });

    expect(mocks.syncSessionOrdersToCheck).toHaveBeenCalledWith({
      restaurantId: 1,
      sessionId: 10,
      checkId: 100,
    });
    expect(mocks.listActiveOrderIdsForCheck).toHaveBeenCalledWith(1, 100);
    expect(mocks.updateCheckMoney).toHaveBeenCalled();
  });

  it("settleCheckPaid freezes membership-derived totals", async () => {
    // ensureOpenCheckForSession + finalizeOpenCheckById + post-finalize reload
    mocks.findCheckById
      .mockResolvedValueOnce(openCheckRow)
      .mockResolvedValueOnce(openCheckRow)
      .mockResolvedValueOnce({
        ...openCheckRow,
        outcome: "paid",
        totalsFrozenAt: "2026-07-22 11:00:00",
        settledAt: "2026-07-22 11:00:00",
        grandTotal: "10.00",
      });
    mocks.listActiveOrderIdsForCheck.mockResolvedValue([55]);
    mocks.getOrdersByIds.mockResolvedValue([
      { id: 55, status: "served", totalAmount: "10.00" },
    ]);
    mocks.finalizeCheckOutcome.mockResolvedValue(undefined);
    mocks.insertSettlementTransactions.mockResolvedValue(undefined);

    const result = await settleCheckPaid({ restaurantId: 1, sessionId: 10 });

    expect(mocks.listActiveOrderIdsForCheck).toHaveBeenCalledWith(1, 100);
    expect(mocks.finalizeCheckOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "paid",
        grandTotal: "10.00",
      }),
      undefined
    );
    expect(result.outcome).toBe("paid");
  });

  it("voidCheck uses membership discovery then deactivates memberships", async () => {
    // ensureOpenCheckForSession + finalizeOpenCheckById + post-finalize reload
    mocks.findCheckById
      .mockResolvedValueOnce(openCheckRow)
      .mockResolvedValueOnce(openCheckRow)
      .mockResolvedValueOnce({
        ...openCheckRow,
        outcome: "voided",
        voidedAt: "2026-07-22 11:00:00",
        totalsFrozenAt: "2026-07-22 11:00:00",
      });
    mocks.listActiveOrderIdsForCheck.mockResolvedValue([]);
    mocks.getOrdersByIds.mockResolvedValue([]);
    mocks.finalizeCheckOutcome.mockResolvedValue(undefined);

    await voidCheck({ restaurantId: 1, sessionId: 10 });

    expect(mocks.listActiveOrderIdsForCheck).toHaveBeenCalledWith(1, 100);
    expect(mocks.deactivateMembershipsOnCheckVoid).toHaveBeenCalledWith({
      restaurantId: 1,
      checkId: 100,
    });
  });
});

