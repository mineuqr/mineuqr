/**
 * DATA-RETENTION-PLATFORM-1 — composed platform smoke.
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  buildPlatformFallbackPolicy,
  createDataRetentionPlatform,
} from "@shared/data-retention";

describe("createDataRetentionPlatform", () => {
  it("evaluates and advances with diagnostics", () => {
    const platform = createDataRetentionPlatform({
      nowIso: "2026-07-25T00:00:00.000Z",
    });
    platform.policies.register({
      ...buildPlatformFallbackPolicy(
        "financial_shift",
        "2026-01-01T00:00:00.000Z"
      ),
      policyId: "drap.policy.financial_shift.global",
      defaultPolicy: true,
    });

    const subject = {
      restaurantId: 720007,
      entityType: "financial_shift" as const,
      entityId: "fsh_demo",
    };

    const eligibility = platform.evaluate({
      subject,
      timestamps: { referenceAt: "2026-07-01T00:00:00.000Z" },
      currentState: "ACTIVE",
      nowIso: "2026-07-10T00:00:00.000Z",
    });
    expect(eligibility.state).toBe("DISPLAY_WINDOW");

    const step = platform.advance({
      subject,
      timestamps: { referenceAt: "2026-07-01T00:00:00.000Z" },
      currentState: "ACTIVE",
      nowIso: "2026-07-10T00:00:00.000Z",
    });
    expect(step.to).toBe("DISPLAY_WINDOW");
    expect(step.applied).toBe(true);

    const metrics = platform.diagnostics.metrics();
    expect(metrics.transitionsAttempted).toBeGreaterThanOrEqual(1);
    expect(platform.flags.purgeJobsEnabled).toBe(false);
  });
});
