import { afterEach, describe, expect, it } from "vitest";
import {
  DRAWER_ATTRIBUTION_DEFERRED_RESUME_MS,
  getParkedDrawerAttribution,
  listActiveParkedDrawerAttributionFactIds,
  parkDrawerAttributionDiscovery,
  resetDrawerAttributionDiscoveryParkForTests,
} from "../recoveryDiscoveryPark";

describe("drawer attribution discovery park", () => {
  afterEach(() => {
    resetDrawerAttributionDiscoveryParkForTests();
  });

  it("keeps a permanent park inspectable and excluded until restart", () => {
    const parked = parkDrawerAttributionDiscovery({
      collectionFactId: "cf-old",
      restaurantId: 7,
      classification: "permanently_unrecoverable",
      gaps: ["no_shift_at_commit_time"],
      reason: "no historical Shift",
    });
    expect(parked.resumeAtMs).toBeNull();
    expect(listActiveParkedDrawerAttributionFactIds()).toEqual(["cf-old"]);
    expect(getParkedDrawerAttribution("cf-old")?.gaps).toEqual([
      "no_shift_at_commit_time",
    ]);
    expect(listActiveParkedDrawerAttributionFactIds(Date.now() + 365 * 86400_000)).toEqual([
      "cf-old",
    ]);
  });

  it("reactivates a deferred park only after resumeAt", () => {
    const now = 1_000_000;
    parkDrawerAttributionDiscovery({
      collectionFactId: "cf-deferred",
      restaurantId: 7,
      classification: "deferred",
      gaps: ["financial_shift_unavailable"],
      reason: "register not paired",
      nowMs: now,
    });
    expect(listActiveParkedDrawerAttributionFactIds(now + 1)).toEqual([
      "cf-deferred",
    ]);
    expect(
      listActiveParkedDrawerAttributionFactIds(
        now + DRAWER_ATTRIBUTION_DEFERRED_RESUME_MS
      )
    ).toEqual([]);
    expect(getParkedDrawerAttribution("cf-deferred")).toBeUndefined();
  });

  it("is idempotent when the same CF is parked twice", () => {
    parkDrawerAttributionDiscovery({
      collectionFactId: "cf-1",
      restaurantId: 1,
      classification: "permanently_unrecoverable",
      gaps: ["ambiguous_shift_at_commit_time"],
      reason: "ambiguous",
    });
    parkDrawerAttributionDiscovery({
      collectionFactId: "cf-1",
      restaurantId: 1,
      classification: "permanently_unrecoverable",
      gaps: ["ambiguous_shift_at_commit_time"],
      reason: "ambiguous again",
    });
    expect(listActiveParkedDrawerAttributionFactIds()).toEqual(["cf-1"]);
    expect(getParkedDrawerAttribution("cf-1")?.reason).toBe("ambiguous again");
  });
});
