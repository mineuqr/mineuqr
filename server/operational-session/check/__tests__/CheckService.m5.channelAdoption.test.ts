/**
 * CHECK-GENERALIZATION-M5 — channel adoption: Session create seeds without Session money scan.
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
  getOrdersBySessionId: vi.fn(),
  getOrdersByIds: vi.fn(),
  getRestaurantById: vi.fn(),
  listActiveOrderIdsForCheck: vi.fn(),
  syncSessionOrdersToCheck: vi.fn(),
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
  finalizeCheckOutcome: vi.fn(),
}));

vi.mock("../settlementTransactionRepository", () => ({
  insertSettlementTransactions: vi.fn(),
}));

vi.mock("../checkMembershipService", () => ({
  syncSessionOrdersToCheck: (...a: unknown[]) =>
    mocks.syncSessionOrdersToCheck(...a),
  deactivateMembershipsOnCheckVoid: vi.fn(),
  enrollOrderInCheck: vi.fn(),
}));

vi.mock("../checkOrderMembershipRepository", () => ({
  listActiveOrderIdsForCheck: (...a: unknown[]) =>
    mocks.listActiveOrderIdsForCheck(...a),
  findBlockingMembershipForOrder: vi.fn(),
}));

import { createOpenCheckForSession } from "../CheckService";

describe("CHECK-GENERALIZATION-M5 createOpenCheckForSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authoritative = true;
    mocks.dualWrite = true;
    mocks.findSessionById.mockResolvedValue({
      id: 10,
      restaurantId: 1,
      status: "open",
      activeCheckId: null,
    });
    mocks.findOpenCheckBySessionId.mockResolvedValue(null);
    mocks.getRestaurantById.mockResolvedValue({
      id: 1,
      currencyCode: "SAR",
      currencySymbol: "ر.س",
    });
    mocks.insertOperationalCheck.mockResolvedValue(100);
    mocks.syncSessionOrdersToCheck.mockResolvedValue(undefined);
    mocks.listActiveOrderIdsForCheck.mockResolvedValue([55]);
    mocks.getOrdersByIds.mockResolvedValue([
      { id: 55, status: "pending", totalAmount: "10.00" },
    ]);
    mocks.findCheckById.mockResolvedValue({
      id: 100,
      restaurantId: 1,
      sessionId: 10,
      outcome: "open",
      currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
      taxPolicySnapshot: {
        taxEnabled: false,
        taxMode: "exclusive",
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
    });
  });

  it("seeds Check at zero then refreshes from Membership — no Session money scan seed", async () => {
    await createOpenCheckForSession({ restaurantId: 1, sessionId: 10 });

    expect(mocks.getOrdersBySessionId).not.toHaveBeenCalled();
    expect(mocks.insertOperationalCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 10,
        subtotal: "0.00",
        grandTotal: "0.00",
      }),
      undefined
    );
    expect(mocks.syncSessionOrdersToCheck).toHaveBeenCalled();
    expect(mocks.listActiveOrderIdsForCheck).toHaveBeenCalledWith(1, 100);
    expect(mocks.updateCheckMoney).toHaveBeenCalledWith(
      expect.objectContaining({ checkId: 100, subtotal: "10.00" })
    );
  });
});
