/**
 * CHECK-GENERALIZATION-M1 — membership dual-write unit tests.
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
  dualWriteEnabled: true,
}));

vi.mock("../../../_core/env", () => ({
  ENV: {
    get checkMembershipDualWrite() {
      return mocks.dualWriteEnabled;
    },
  },
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
  dualWriteEnrollOrderForSession,
} from "../checkMembershipService";

describe("CHECK-GENERALIZATION-M1 membership dual-write", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.dualWriteEnabled = true;
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

  it("skips when dual-write disabled (rollback)", async () => {
    mocks.dualWriteEnabled = false;
    const status = await enrollOrderInCheck({
      restaurantId: 1,
      checkId: 10,
      orderId: 5,
      enrolledReason: "session_attach",
    });
    expect(status).toBe("skipped");
    expect(mocks.findCheckById).not.toHaveBeenCalled();
  });

  it("dualWriteEnrollOrderForSession does not throw on failure", async () => {
    mocks.findOpenCheckBySessionId.mockResolvedValue({ id: 10 });
    mocks.findCheckById.mockRejectedValue(new Error("db down"));

    await expect(
      dualWriteEnrollOrderForSession({
        restaurantId: 1,
        sessionId: 3,
        orderId: 5,
      })
    ).resolves.toBeUndefined();
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
