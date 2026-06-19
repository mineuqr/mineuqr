import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  update: vi.fn(),
  set: vi.fn(),
  where: vi.fn(),
}));

vi.mock("../db", () => ({
  getDb: vi.fn(async () => ({
    update: dbMocks.update,
  })),
}));

import { updateSessionAggregates } from "./sessionRepository";
import { DiningSessionUnavailableError } from "./sessionTypes";

describe("sessionRepository.updateSessionAggregates SESSION-AGGREGATES-1 Phase A", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.where.mockResolvedValue(undefined);
    dbMocks.set.mockReturnValue({ where: dbMocks.where });
    dbMocks.update.mockReturnValue({ set: dbMocks.set });
  });

  it("issues atomic increment update scoped by restaurant and session", async () => {
    await updateSessionAggregates({
      restaurantId: 1,
      sessionId: 10,
      totalOrdersDelta: 1,
      totalAmountDelta: "20.00",
    });

    expect(dbMocks.update).toHaveBeenCalledTimes(1);
    expect(dbMocks.set).toHaveBeenCalledTimes(1);
    expect(dbMocks.where).toHaveBeenCalledTimes(1);
  });

  it("rejects non-finite totalOrdersDelta", async () => {
    await expect(
      updateSessionAggregates({
        restaurantId: 1,
        sessionId: 10,
        totalOrdersDelta: Number.NaN,
        totalAmountDelta: "10.00",
      })
    ).rejects.toBeInstanceOf(DiningSessionUnavailableError);

    expect(dbMocks.update).not.toHaveBeenCalled();
  });

  it("rejects invalid totalAmountDelta", async () => {
    await expect(
      updateSessionAggregates({
        restaurantId: 1,
        sessionId: 10,
        totalOrdersDelta: 1,
        totalAmountDelta: "invalid",
      })
    ).rejects.toBeInstanceOf(DiningSessionUnavailableError);

    expect(dbMocks.update).not.toHaveBeenCalled();
  });
});
