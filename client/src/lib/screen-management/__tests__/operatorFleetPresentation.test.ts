import { describe, expect, it } from "vitest";
import type { FleetScreenReadModel } from "@/lib/screen-fleet/fleetReadModel";
import {
  countNeedsAttention,
  formatCategorySummary,
  matchesOperatorFleetFilter,
  screenNeedsAttention,
} from "../operatorFleetPresentation";

function baseScreen(overrides: Partial<FleetScreenReadModel> = {}): FleetScreenReadModel {
  return {
    screenId: "dev_test",
    displayName: "Kitchen",
    role: "kitchen_display",
    branchId: null,
    zoneId: null,
    canonicalState: {
      operationalState: "operational",
      connectivityState: "connected",
      businessReadiness: "ready",
      maintenanceState: "normal",
    },
    businessReadiness: "ready",
    healthSummary: {
      presence: "online",
      operational: true,
      hasActiveToken: true,
      warningCount: 0,
    },
    lastHeartbeat: "2026-07-12T12:00:00.000Z",
    reportedVersion: "web",
    configurationVersion: "1",
    tenantId: 1,
    updatedAt: "2026-07-12T12:00:00.000Z",
    createdAt: "2026-07-12T12:00:00.000Z",
    ...overrides,
  };
}

describe("operatorFleetPresentation", () => {
  it("flags screens that need attention", () => {
    expect(screenNeedsAttention(baseScreen())).toBe(false);
    expect(
      screenNeedsAttention(
        baseScreen({
          healthSummary: { ...baseScreen().healthSummary, hasActiveToken: false },
          businessReadiness: "pairing_required",
        })
      )
    ).toBe(true);
  });

  it("filters by operator buckets", () => {
    const online = baseScreen();
    const offline = baseScreen({
      screenId: "dev_off",
      healthSummary: { ...baseScreen().healthSummary, presence: "offline" },
    });
    expect(matchesOperatorFleetFilter(online, "online")).toBe(true);
    expect(matchesOperatorFleetFilter(offline, "online")).toBe(false);
    expect(matchesOperatorFleetFilter(offline, "offline")).toBe(true);
  });

  it("formats category summary for kitchen roles", () => {
    const names = new Map<number, string>([[1, "Grills"]]);
    expect(formatCategorySummary("kitchen_display", [], names, false)).toBe("All items");
    expect(formatCategorySummary("kitchen_display", [1], names, false)).toBe("Grills");
    expect(formatCategorySummary("pickup_display", [], names, false)).toBeNull();
  });

  it("counts needs attention", () => {
    const screens = [
      baseScreen(),
      baseScreen({
        screenId: "dev_two",
        canonicalState: {
          ...baseScreen().canonicalState,
          maintenanceState: "maintenance",
          operationalState: "maintenance",
        },
      }),
    ];
    expect(countNeedsAttention(screens)).toBe(1);
  });
});
