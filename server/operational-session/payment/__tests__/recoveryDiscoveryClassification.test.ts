import { describe, expect, it } from "vitest";
import { classifyDrawerAttributionRecovery } from "../recoveryDiscoveryClassification";

describe("classifyDrawerAttributionRecovery", () => {
  it("maps created and already_applied to resolved work", () => {
    expect(
      classifyDrawerAttributionRecovery({ outcome: "created", gaps: [] })
    ).toBe("recovered");
    expect(
      classifyDrawerAttributionRecovery({
        outcome: "already_applied",
        gaps: [],
      })
    ).toBe("already_resolved");
  });

  it("treats temporal Shift gaps as permanently unrecoverable", () => {
    for (const gap of [
      "no_shift_at_commit_time",
      "ambiguous_shift_at_commit_time",
      "shift_not_writable_for_attribution",
      "collection_fact_outside_shift_window",
    ] as const) {
      expect(
        classifyDrawerAttributionRecovery({
          outcome: "skipped",
          gaps: [gap, "financial_shift_unavailable"],
        })
      ).toBe("permanently_unrecoverable");
    }
  });

  it("keeps writer and resolver failures retryable", () => {
    expect(
      classifyDrawerAttributionRecovery({
        outcome: "failed",
        gaps: ["attribution_create_failed"],
      })
    ).toBe("retryable");
    expect(
      classifyDrawerAttributionRecovery({
        outcome: "skipped",
        gaps: ["crmp_resolution_error"],
      })
    ).toBe("retryable");
  });

  it("defers incomplete context that may appear later", () => {
    expect(
      classifyDrawerAttributionRecovery({
        outcome: "skipped",
        gaps: ["financial_shift_unavailable"],
      })
    ).toBe("deferred");
  });

  it("does not classify restaurant isolation as retryable", () => {
    expect(
      classifyDrawerAttributionRecovery({
        outcome: "failed",
        gaps: ["wrong_restaurant"],
      })
    ).toBe("permanently_unrecoverable");
  });
});
