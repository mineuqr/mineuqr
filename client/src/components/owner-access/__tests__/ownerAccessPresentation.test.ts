/**
 * PLATFORM-OWNER-ACCESS-MODE-IMPLEMENTATION-1 — UI presentation.
 */
import { describe, expect, it } from "vitest";
import {
  isOwnerFullPlatform,
  isOwnerSimulation,
  ownerAccessStatusLabel,
} from "../ownerAccessPresentation";

describe("owner access presentation", () => {
  it("labels Full Platform and simulation without assuming success on error", () => {
    expect(
      ownerAccessStatusLabel({
        status: "ok",
        mode: "FULL_PLATFORM",
        simulatedPlanCode: null,
        simulatedPlanName: null,
      }).key
    ).toBe("ownerAccess.fullPlatform");
    expect(
      ownerAccessStatusLabel({
        status: "ok",
        mode: "SIMULATED_PLAN",
        simulatedPlanCode: "professional",
        simulatedPlanName: "Professional",
      }).key
    ).toBe("ownerAccess.simulating");
    expect(
      ownerAccessStatusLabel({
        status: "unavailable",
        mode: null,
        simulatedPlanCode: null,
        simulatedPlanName: null,
      }).key
    ).toBe("ownerAccess.unavailable");
  });

  it("detects simulation vs full platform", () => {
    expect(
      isOwnerSimulation({
        status: "ok",
        mode: "SIMULATED_PLAN",
        simulatedPlanCode: "basic",
        simulatedPlanName: "Basic",
      })
    ).toBe(true);
    expect(
      isOwnerFullPlatform({
        status: "ok",
        mode: "FULL_PLATFORM",
        simulatedPlanCode: null,
        simulatedPlanName: null,
      })
    ).toBe(true);
    expect(
      isOwnerFullPlatform({
        status: "unavailable",
        mode: null,
        simulatedPlanCode: null,
        simulatedPlanName: null,
      })
    ).toBe(false);
  });
});
