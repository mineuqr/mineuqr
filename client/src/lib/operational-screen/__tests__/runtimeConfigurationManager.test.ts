import { describe, expect, it } from "vitest";
import { RuntimeConfigurationManager } from "../configuration/runtimeConfigurationManager";
import type { RuntimeGetStatusResponse } from "../runtimeTypes";
import { kitchenDisplayRole } from "../roles/roleDefinitions";

function mockStatus(
  overrides: Partial<RuntimeGetStatusResponse> = {}
): RuntimeGetStatusResponse {
  return {
    device: {
      deviceId: "dev-1",
      role: "kitchen_display",
      displayName: "Kitchen 1",
      restaurantId: 1,
      branchId: null,
      status: "active",
    },
    screenConfig: {
      language: "en",
      displayDirection: "ltr",
      displayDensity: "compact",
      visibleCategoryIds: [1, 2],
    },
    configVersion: "v1",
    health: {
      presence: "online",
      operational: true,
      status: "active",
      reportedVersion: "web",
      lastSeenAt: null,
      hasActiveToken: true,
    },
    ...overrides,
  };
}

describe("RuntimeConfigurationManager", () => {
  const capabilities = kitchenDisplayRole.metadata.capabilities;

  it("loads, validates, normalizes, and applies configuration", () => {
    const manager = new RuntimeConfigurationManager();
    const config = manager.loadFromStatus(mockStatus(), capabilities);

    expect(config.configurationState).toBe("applied");
    expect(config.active.language).toBe("en");
    expect(config.active.direction).toBe("ltr");
    expect(config.tracked.density).toBe("compact");
    expect(config.tracked.densityActivated).toBe(true);
    expect(config.tracked.categoryIds).toEqual([1, 2]);
    expect(config.tracked.categoriesActivated).toBe(true);
    expect(manager.getSnapshot().lastAppliedVersion).toBe("v1");
  });

  it("detects version changes and reloads without page refresh", () => {
    const manager = new RuntimeConfigurationManager();
    manager.loadFromStatus(mockStatus(), capabilities);

    expect(manager.detectVersionChange("v1")).toBe(false);
    expect(manager.detectVersionChange("v2")).toBe(true);

    const reloaded = manager.reloadFromStatus(
      mockStatus({
        configVersion: "v2",
        screenConfig: {
          language: "ar",
          displayDirection: "rtl",
          displayDensity: "large",
          visibleCategoryIds: [],
        },
      }),
      capabilities
    );

    expect(reloaded?.version).toBe("v2");
    expect(reloaded?.active.language).toBe("ar");
    expect(reloaded?.configurationState).toBe("applied");
    expect(manager.getSnapshot().lastReloadAt).not.toBeNull();
  });

  it("returns null when reload version is unchanged", () => {
    const manager = new RuntimeConfigurationManager();
    manager.loadFromStatus(mockStatus(), capabilities);
    const same = manager.reloadFromStatus(mockStatus(), capabilities);
    expect(same).toBeNull();
  });

  it("uses fallback for invalid configuration without crashing", () => {
    const manager = new RuntimeConfigurationManager();
    const config = manager.loadFromStatus(
      mockStatus({
        screenConfig: {
          language: "fr" as "en",
          displayDirection: "invalid" as "ltr",
          displayDensity: "invalid" as "large",
          visibleCategoryIds: "bad" as unknown as number[],
        },
      }),
      capabilities
    );

    expect(config.usedFallback).toBe(true);
    expect(config.validationErrors.length).toBeGreaterThan(0);
    expect(config.active.language).toBe("ar");
    expect(config.configurationState).toBe("applied");
  });

  it("ignores density/categories for roles without capability support", () => {
    const manager = new RuntimeConfigurationManager();
    const blockedCapabilities = {
      supportsOrders: true,
      supportsTickets: false,
      supportsQueue: true,
      supportsReadyOrders: true,
      supportsDensity: false,
      supportsCategoryFilter: false,
      supportsTimeline: false,
      supportsAnimation: false,
      supportsPrintMonitor: false,
    };

    const config = manager.loadFromStatus(
      mockStatus({
        device: { ...mockStatus().device, role: "pickup_display" },
        screenConfig: {
          language: "en",
          displayDirection: "ltr",
          displayDensity: "compact",
          visibleCategoryIds: [99],
        },
      }),
      blockedCapabilities
    );

    expect(config.tracked.categoriesActivated).toBe(false);
    expect(config.tracked.categoryIds).toEqual([]);
  });

  it("reports configuration health", () => {
    const manager = new RuntimeConfigurationManager();
    manager.loadFromStatus(mockStatus(), capabilities);
    const health = manager.buildHealth("v1");

    expect(health?.configurationState).toBe("applied");
    expect(health?.appliedVersion).toBe("v1");
    expect(health?.versionMismatch).toBe(false);
  });

  it("BUGFIX-F004 — repeated heartbeat timestamps do not trigger reload when config version is stable", () => {
    const manager = new RuntimeConfigurationManager();
    manager.loadFromStatus(mockStatus({ configVersion: "1" }), capabilities);

    const heartbeatPolls = [
      mockStatus({ configVersion: "1", health: { ...mockStatus().health, lastSeenAt: "2026-07-06T10:00:01.000Z" } }),
      mockStatus({ configVersion: "1", health: { ...mockStatus().health, lastSeenAt: "2026-07-06T10:00:31.000Z" } }),
      mockStatus({ configVersion: "1", health: { ...mockStatus().health, lastSeenAt: "2026-07-06T10:01:01.000Z" } }),
    ];

    for (const poll of heartbeatPolls) {
      expect(manager.detectVersionChange(poll.configVersion)).toBe(false);
      expect(manager.reloadFromStatus(poll, capabilities)).toBeNull();
    }
  });

  it("BUGFIX-F004 — reload occurs only when configuration revision changes", () => {
    const manager = new RuntimeConfigurationManager();
    manager.loadFromStatus(mockStatus({ configVersion: "1" }), capabilities);

    expect(manager.detectVersionChange("2")).toBe(true);
    const reloaded = manager.reloadFromStatus(
      mockStatus({
        configVersion: "2",
        screenConfig: {
          language: "ar",
          displayDirection: "rtl",
          displayDensity: "large",
          visibleCategoryIds: [9],
        },
      }),
      capabilities
    );
    expect(reloaded?.version).toBe("2");
    expect(reloaded?.tracked.categoryIds).toEqual([9]);
  });
});
