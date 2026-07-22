/**
 * CHECK-GENERALIZATION-M1 — membership authoritative enroll/sync unit tests.
 * COMPATIBILITY-CLEANUP-1 — dual-write helpers removed.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findCheckById: vi.fn(),
  findOpenCheckBySessionId: vi.fn(),
  getOrderById: vi.fn(),
  getOrdersBySessionId: vi.fn(),
  findBlockingMembershipForOrder: vi.fn(),
  findMembershipOnCheck: vi.fn(),
  insertCheckOrderMembership: vi.fn(),
  reactivateCheckOrderMembership: vi.fn(),
  deactivateMembershipsForCheck: vi.fn(),
}));

vi.mock("../../../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

vi.mock("../../../db", () => ({
  getOrderById: (...args: unknown[]) => mocks.getOrderById(...args),
  getOrdersBySessionId: (...args: unknown[]) => mocks.getOrdersBySessionId(...args),
}));

vi.mock("../checkRepository", () => ({
  findCheckById: (...args: unknown[]) => mocks.findCheckById(...args),
  findOpenCheckBySessionId: (...args: unknown[]) =>
    mocks.findOpenCheckBySessionId(...args),
}));

vi.mock("../checkOrderMembershipRepository", () => ({
  findBlockingMembershipForOrder: (...args: unknown[]) =>
    mocks.findBlockingMembershipForOrder(...args),
  findMembershipOnCheck: (...args: unknown[]) =>
    mocks.findMembershipOnCheck(...args),
  insertCheckOrderMembership: (...args: unknown[]) =>
    mocks.insertCheckOrderMembership(...args),
  reactivateCheckOrderMembership: (...args: unknown[]) =>
    mocks.reactivateCheckOrderMembership(...args),
  deactivateMembershipsForCheck: (...args: unknown[]) =>
    mocks.deactivateMembershipsForCheck(...args),
}));

import {
  enrollOrderInCheck,
  enrollOrderForSessionCheck,
  syncSessionOrdersToCheck,
} from "../checkMembershipService";

describe("CHECK-GENERALIZATION-M1 membership service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMembershipOnCheck.mockResolvedValue(null);
    mocks.findBlockingMembershipForOrder.mockResolvedValue(null);
    mocks.insertCheckOrderMembership.mockResolvedValue(1);
  });

  it("enrolls order into open check", async () => {
    mocks.findCheckById.mockResolvedValue({
      id: 10,
      restaurantId: 1,
      outcome: "open",
    });
    mocks.getOrderById.mockResolvedValue({ id: 5, restaurantId: 1 });

    const status = await enrollOrderInCheck({
      restaurantId: 1,
      checkId: 10,
      orderId: 5,
      enrolledReason: "session_attach",
    });

    expect(status).toBe("enrolled");
    expect(mocks.insertCheckOrderMembership).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: 1,
        checkId: 10,
        orderId: 5,
        enrolledReason: "session_attach",
      }),
      undefined
    );
  });

  it("is idempotent when already active on same check", async () => {
    mocks.findCheckById.mockResolvedValue({
      id: 10,
      restaurantId: 1,
      outcome: "open",
    });
    mocks.getOrderById.mockResolvedValue({ id: 5, restaurantId: 1 });
    mocks.findMembershipOnCheck.mockResolvedValue({
      id: 1,
      checkId: 10,
      orderId: 5,
      active: 1,
    });

    const status = await enrollOrderInCheck({
      restaurantId: 1,
      checkId: 10,
      orderId: 5,
      enrolledReason: "session_attach",
    });

    expect(status).toBe("already");
    expect(mocks.insertCheckOrderMembership).not.toHaveBeenCalled();
  });

  it("rejects second check enrollment for same order", async () => {
    mocks.findCheckById.mockResolvedValue({
      id: 20,
      restaurantId: 1,
      outcome: "open",
    });
    mocks.getOrderById.mockResolvedValue({ id: 5, restaurantId: 1 });
    mocks.findBlockingMembershipForOrder.mockResolvedValue({
      membership: { checkId: 10, orderId: 5, active: 1 },
      checkOutcome: "open",
    });

    await expect(
      enrollOrderInCheck({
        restaurantId: 1,
        checkId: 20,
        orderId: 5,
        enrolledReason: "session_attach",
      })
    ).rejects.toThrow(/already enrolled/);
  });

  it("enrollOrderForSessionCheck enrolls via open Session Check", async () => {
    mocks.findOpenCheckBySessionId.mockResolvedValue({ id: 10 });
    mocks.findCheckById.mockResolvedValue({
      id: 10,
      restaurantId: 1,
      outcome: "open",
    });
    mocks.getOrderById.mockResolvedValue({ id: 5, restaurantId: 1 });

    await enrollOrderForSessionCheck({
      restaurantId: 1,
      sessionId: 3,
      orderId: 5,
    });

    expect(mocks.insertCheckOrderMembership).toHaveBeenCalled();
  });

  it("syncSessionOrdersToCheck enrolls all Session orders", async () => {
    mocks.getOrdersBySessionId.mockResolvedValue([{ id: 5 }, { id: 6 }]);
    mocks.findCheckById.mockResolvedValue({
      id: 10,
      restaurantId: 1,
      outcome: "open",
    });
    mocks.getOrderById
      .mockResolvedValueOnce({ id: 5, restaurantId: 1 })
      .mockResolvedValueOnce({ id: 6, restaurantId: 1 });

    await syncSessionOrdersToCheck({
      restaurantId: 1,
      sessionId: 3,
      checkId: 10,
    });

    expect(mocks.insertCheckOrderMembership).toHaveBeenCalledTimes(2);
  });

  it("allows backfill enroll onto paid check", async () => {
    mocks.findCheckById.mockResolvedValue({
      id: 10,
      restaurantId: 1,
      outcome: "paid",
    });
    mocks.getOrderById.mockResolvedValue({ id: 5, restaurantId: 1 });

    const status = await enrollOrderInCheck({
      restaurantId: 1,
      checkId: 10,
      orderId: 5,
      enrolledReason: "backfill",
    });
    expect(status).toBe("enrolled");
  });
});
