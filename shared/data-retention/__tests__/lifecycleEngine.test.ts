/**
 * DATA-RETENTION-PLATFORM-1 — lifecycle transitions & idempotency.
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  advanceLifecycleTowardEligibility,
  buildPlatformFallbackPolicy,
  evaluateRetentionEligibility,
  transitionLifecycleState,
} from "@shared/data-retention";

const policy = buildPlatformFallbackPolicy(
  "financial_shift",
  "2026-01-01T00:00:00.000Z"
);

describe("lifecycle engine", () => {
  it("keeps open entities ACTIVE", () => {
    const eligibility = evaluateRetentionEligibility({
      policy,
      timestamps: { referenceAt: "2026-01-01T00:00:00.000Z" },
      currentState: "ACTIVE",
      nowIso: "2026-06-01T00:00:00.000Z",
      entityOpen: true,
    });
    expect(eligibility.state).toBe("ACTIVE");
    expect(eligibility.archiveEligible).toBe(false);
  });

  it("places closed entity inside display window", () => {
    const eligibility = evaluateRetentionEligibility({
      policy,
      timestamps: { referenceAt: "2026-07-01T00:00:00.000Z" },
      currentState: "ACTIVE",
      nowIso: "2026-07-10T00:00:00.000Z",
      entityOpen: false,
    });
    expect(eligibility.state).toBe("DISPLAY_WINDOW");
    expect(eligibility.inDisplayWindow).toBe(true);
  });

  it("marks archive eligible after operational retention", () => {
    const eligibility = evaluateRetentionEligibility({
      policy,
      timestamps: { referenceAt: "2024-01-01T00:00:00.000Z" },
      currentState: "OPERATIONAL_RETENTION",
      nowIso: "2026-07-01T00:00:00.000Z",
      entityOpen: false,
    });
    expect(eligibility.state).toBe("ARCHIVE_ELIGIBLE");
    expect(eligibility.archiveEligible).toBe(true);
  });

  it("forbids non-adjacent transitions", () => {
    const result = transitionLifecycleState({
      from: "ACTIVE",
      to: "ARCHIVED",
    });
    expect(result.applied).toBe(false);
    expect(result.reasons).toContain("non_adjacent_transition_forbidden");
  });

  it("advances one step idempotently toward target", () => {
    const first = advanceLifecycleTowardEligibility({
      policy,
      timestamps: { referenceAt: "2026-07-01T00:00:00.000Z" },
      currentState: "ACTIVE",
      nowIso: "2026-07-10T00:00:00.000Z",
    });
    expect(first.applied).toBe(true);
    expect(first.to).toBe("DISPLAY_WINDOW");

    const second = advanceLifecycleTowardEligibility({
      policy,
      timestamps: { referenceAt: "2026-07-01T00:00:00.000Z" },
      currentState: "DISPLAY_WINDOW",
      nowIso: "2026-07-10T00:00:00.000Z",
    });
    expect(second.applied).toBe(false);
    expect(second.idempotent).toBe(true);
  });

  it("marks archived subject restorable within archive retention", () => {
    const eligibility = evaluateRetentionEligibility({
      policy: { ...policy, purgeEnabled: false },
      timestamps: {
        referenceAt: "2024-01-01T00:00:00.000Z",
        archivedAt: "2026-01-01T00:00:00.000Z",
      },
      currentState: "ARCHIVED",
      nowIso: "2026-02-01T00:00:00.000Z",
    });
    expect(eligibility.state).toBe("RESTORABLE");
    expect(eligibility.restoreEligible).toBe(true);
    expect(eligibility.purgeEligible).toBe(false);
  });
});
