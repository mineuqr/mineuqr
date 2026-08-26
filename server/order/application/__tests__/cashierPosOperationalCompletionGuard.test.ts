import { beforeEach, describe, expect, it, vi } from "vitest";
import { LifecycleSettlementGuardError } from "@shared/operational-session";
import { assertCashierPosOrderCompletable } from "../cashierPosOperationalCompletionGuard";

const mocks = vi.hoisted(() => ({
  findFinanciallyCompleteMembershipForOrder: vi.fn(),
  findProductionCollectionFactByOrderId: vi.fn(),
}));

vi.mock("../../../operational-session/check/checkOrderMembershipRepository", () => ({
  findFinanciallyCompleteMembershipForOrder: (...a: unknown[]) =>
    mocks.findFinanciallyCompleteMembershipForOrder(...a),
}));

vi.mock("../../../operational-session/payment/collection-fact/collectionFactRepository", () => ({
  findProductionCollectionFactByOrderId: (...a: unknown[]) =>
    mocks.findProductionCollectionFactByOrderId(...a),
}));

describe("assertCashierPosOrderCompletable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFinanciallyCompleteMembershipForOrder.mockResolvedValue(null);
    mocks.findProductionCollectionFactByOrderId.mockResolvedValue(null);
  });

  it("allows a paid Check without reading Collection Fact", async () => {
    mocks.findFinanciallyCompleteMembershipForOrder.mockResolvedValue({
      checkOutcome: "paid",
    });
    await expect(
      assertCashierPosOrderCompletable({ restaurantId: 1, orderId: 8 })
    ).resolves.toBeUndefined();
    expect(mocks.findProductionCollectionFactByOrderId).not.toHaveBeenCalled();
  });

  it("allows a complimentary Check", async () => {
    mocks.findFinanciallyCompleteMembershipForOrder.mockResolvedValue({
      checkOutcome: "complimentary",
    });
    await expect(
      assertCashierPosOrderCompletable({ restaurantId: 1, orderId: 8 })
    ).resolves.toBeUndefined();
  });

  it("allows a production Collection Fact when Check membership is open-only", async () => {
    mocks.findFinanciallyCompleteMembershipForOrder.mockResolvedValue(null);
    mocks.findProductionCollectionFactByOrderId.mockResolvedValue({
      collectionFactId: "cf-1",
    });
    await expect(
      assertCashierPosOrderCompletable({ restaurantId: 1, orderId: 8 })
    ).resolves.toBeUndefined();
  });

  it("rejects when neither paid Check nor production Collection Fact exists", async () => {
    await expect(
      assertCashierPosOrderCompletable({ restaurantId: 1, orderId: 8 })
    ).rejects.toMatchObject({ code: "ORDER_REQUIRES_SETTLEMENT" });
    expect(mocks.findProductionCollectionFactByOrderId).toHaveBeenCalledWith({
      restaurantId: 1,
      orderId: 8,
    });
  });

  it("does not let an open membership hide a paid Check lookup", async () => {
    mocks.findFinanciallyCompleteMembershipForOrder.mockResolvedValue({
      checkOutcome: "paid",
    });
    await assertCashierPosOrderCompletable({ restaurantId: 1, orderId: 8 });
    expect(mocks.findFinanciallyCompleteMembershipForOrder).toHaveBeenCalledWith(
      1,
      8
    );
  });

  it("throws LifecycleSettlementGuardError rather than a generic Error", async () => {
    await expect(
      assertCashierPosOrderCompletable({ restaurantId: 1, orderId: 8 })
    ).rejects.toBeInstanceOf(LifecycleSettlementGuardError);
  });
});
