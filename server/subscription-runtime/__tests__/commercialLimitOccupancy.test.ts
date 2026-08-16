/**
 * COMMERCIAL-LIMIT-OCCUPANCY-IMPLEMENTATION-1 — unlocked (test) path.
 */
import { describe, expect, it } from "vitest";
import {
  CommercialLimitExceededError,
  withCommercialLimitOccupancy,
} from "../commercialLimitOccupancy";

describe("withCommercialLimitOccupancy unlocked test path", () => {
  it("allows create below the cap", async () => {
    let occupancy = 0;
    const created = await withCommercialLimitOccupancy({
      scope: { kind: "owner", scopeId: 9, ownerUserId: 9 },
      limitKey: "restaurants",
      decide: async (proposedTotal) => ({
        allowed: proposedTotal <= 1,
        reasonCode: proposedTotal <= 1 ? "within_limit" : "limit_exceeded",
        limitKey: "restaurants",
        cap: 1,
        proposedTotal,
        policy: "hard",
        source: "test",
      }),
      countOccupancy: async () => occupancy,
      create: async () => {
        occupancy += 1;
        return { id: occupancy };
      },
    });
    expect(created).toEqual({ id: 1 });
    expect(occupancy).toBe(1);
  });

  it("denies create at the cap", async () => {
    await expect(
      withCommercialLimitOccupancy({
        scope: { kind: "restaurant", scopeId: 3, ownerUserId: 9 },
        limitKey: "categories",
        decide: async () => ({
          allowed: false,
          reasonCode: "limit_exceeded",
          limitKey: "categories",
          cap: 2,
          proposedTotal: 3,
          policy: "hard",
          source: "test",
        }),
        countOccupancy: async () => 2,
        create: async () => {
          throw new Error("must not create");
        },
      })
    ).rejects.toBeInstanceOf(CommercialLimitExceededError);
  });

  it("does not keep a resource when create throws", async () => {
    let occupancy = 0;
    await expect(
      withCommercialLimitOccupancy({
        scope: { kind: "owner", scopeId: 9, ownerUserId: 9 },
        limitKey: "restaurants",
        decide: async () => ({
          allowed: true,
          reasonCode: "within_limit",
          limitKey: "restaurants",
          cap: 2,
          proposedTotal: 1,
          policy: "hard",
          source: "test",
        }),
        countOccupancy: async () => occupancy,
        create: async () => {
          throw new Error("insert failed");
        },
      })
    ).rejects.toThrow("insert failed");
    expect(occupancy).toBe(0);
  });

  it("returns an existing domain row without consuming occupancy", async () => {
    const created = await withCommercialLimitOccupancy({
      scope: { kind: "restaurant", scopeId: 3, ownerUserId: 9 },
      limitKey: "posTerminals",
      decide: async () => {
        throw new Error("must not decide");
      },
      countOccupancy: async () => {
        throw new Error("must not count");
      },
      resolveExisting: async () => ({ id: 42 }),
      create: async () => {
        throw new Error("must not create");
      },
    });
    expect(created).toEqual({ id: 42 });
  });

  it("serializes a net-zero replacement without increasing occupancy", async () => {
    let occupancy = 1;
    const replaced = await withCommercialLimitOccupancy({
      scope: { kind: "restaurant", scopeId: 3, ownerUserId: 9 },
      limitKey: "posTerminals",
      occupancyDelta: 0,
      decide: async (proposedTotal) => ({
        allowed: proposedTotal <= 1,
        reasonCode: proposedTotal <= 1 ? "within_limit" : "limit_exceeded",
        limitKey: "posTerminals",
        cap: 1,
        proposedTotal,
        policy: "hard",
        source: "test",
      }),
      countOccupancy: async () => occupancy,
      create: async () => {
        occupancy = occupancy - 1 + 1;
        return { previousId: 1, replacementId: 2 };
      },
    });
    expect(replaced).toEqual({ previousId: 1, replacementId: 2 });
    expect(occupancy).toBe(1);
  });

  it("allows occupancyDelta 0 when occupancy already exceeds a hard cap", async () => {
    let occupancy = 5;
    const replaced = await withCommercialLimitOccupancy({
      scope: { kind: "restaurant", scopeId: 3, ownerUserId: 9 },
      limitKey: "posTerminals",
      occupancyDelta: 0,
      decide: async (proposedTotal) => ({
        allowed: proposedTotal <= 3,
        reasonCode: proposedTotal <= 3 ? "within_limit" : "limit_exceeded",
        limitKey: "posTerminals",
        cap: 3,
        proposedTotal,
        policy: "hard",
        source: "test",
      }),
      countOccupancy: async () => occupancy,
      create: async () => ({ previousId: 1, replacementId: 2 }),
    });
    expect(replaced).toEqual({ previousId: 1, replacementId: 2 });
    expect(occupancy).toBe(5);
  });

  it("still denies occupancyDelta 0 when the plan is not entitled", async () => {
    await expect(
      withCommercialLimitOccupancy({
        scope: { kind: "restaurant", scopeId: 3, ownerUserId: 9 },
        limitKey: "posTerminals",
        occupancyDelta: 0,
        decide: async () => ({
          allowed: false,
          reasonCode: "not_entitled",
          limitKey: "posTerminals",
          cap: 0,
          proposedTotal: 5,
          policy: "denied",
          source: "test",
        }),
        countOccupancy: async () => 5,
        create: async () => {
          throw new Error("must not replace");
        },
      })
    ).rejects.toBeInstanceOf(CommercialLimitExceededError);
  });

  it("still denies occupancyDelta 1 when occupancy already exceeds a hard cap", async () => {
    await expect(
      withCommercialLimitOccupancy({
        scope: { kind: "owner", scopeId: 9, ownerUserId: 9 },
        limitKey: "restaurants",
        occupancyDelta: 1,
        decide: async (proposedTotal) => ({
          allowed: proposedTotal <= 3,
          reasonCode: proposedTotal <= 3 ? "within_limit" : "limit_exceeded",
          limitKey: "restaurants",
          cap: 3,
          proposedTotal,
          policy: "hard",
          source: "test",
        }),
        countOccupancy: async () => 5,
        create: async () => {
          throw new Error("must not create");
        },
      })
    ).rejects.toBeInstanceOf(CommercialLimitExceededError);
  });
});
