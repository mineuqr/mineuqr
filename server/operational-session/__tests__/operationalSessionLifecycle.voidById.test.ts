/**
 * COMPATIBILITY-DEPENDENCY-ELIMINATION-1 — voidOperationalSessionCheck → voidCheckById.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getActiveCheckForSession: vi.fn(),
  ensureOpenCheckForSession: vi.fn(),
  voidCheckById: vi.fn(),
  closeSession: vi.fn(),
  markPaid: vi.fn(),
  markComplimentary: vi.fn(),
}));

vi.mock("../../diningSession/sessionService", () => ({
  closeSession: (...a: unknown[]) => mocks.closeSession(...a),
  markPaid: (...a: unknown[]) => mocks.markPaid(...a),
  markComplimentary: (...a: unknown[]) => mocks.markComplimentary(...a),
}));

vi.mock("../check", () => ({
  getActiveCheckForSession: (...a: unknown[]) =>
    mocks.getActiveCheckForSession(...a),
  ensureOpenCheckForSession: (...a: unknown[]) =>
    mocks.ensureOpenCheckForSession(...a),
  voidCheckById: (...a: unknown[]) => mocks.voidCheckById(...a),
}));

import { voidOperationalSessionCheck } from "../operationalSessionLifecycle";

describe("voidOperationalSessionCheck Check ById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("voids via activeCheckId", async () => {
    mocks.getActiveCheckForSession.mockResolvedValue({ id: 100, outcome: "open" });
    mocks.voidCheckById.mockResolvedValue({ id: 100, outcome: "voided" });

    const result = await voidOperationalSessionCheck({
      restaurantId: 1,
      sessionId: 10,
    });

    expect(mocks.voidCheckById).toHaveBeenCalledWith({
      restaurantId: 1,
      checkId: 100,
    });
    expect(mocks.ensureOpenCheckForSession).not.toHaveBeenCalled();
    expect(result.outcome).toBe("voided");
  });

  it("ensures open Check then voids by id when no active Check", async () => {
    mocks.getActiveCheckForSession.mockResolvedValue(null);
    mocks.ensureOpenCheckForSession.mockResolvedValue({ id: 200 });
    mocks.voidCheckById.mockResolvedValue({ id: 200, outcome: "voided" });

    await voidOperationalSessionCheck({ restaurantId: 1, sessionId: 10 });

    expect(mocks.ensureOpenCheckForSession).toHaveBeenCalledWith({
      restaurantId: 1,
      sessionId: 10,
    });
    expect(mocks.voidCheckById).toHaveBeenCalledWith({
      restaurantId: 1,
      checkId: 200,
    });
  });
});
