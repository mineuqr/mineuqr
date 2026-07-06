import { describe, expect, it } from "vitest";
import { RuntimeDisplayDensityManager } from "../density/runtimeDisplayDensityManager";
import type { RuntimeConfiguration } from "../configuration/runtimeConfigurationContract";
import { kitchenDisplayRole } from "../roles/roleDefinitions";
import {
  COMFORTABLE_DENSITY_MODEL,
  COMPACT_DENSITY_MODEL,
} from "../density/presentationDensityModels";

function mockConfiguration(
  density: "large" | "comfortable" | "compact",
  version = "v1"
): RuntimeConfiguration {
  return {
    version,
    role: "kitchen_display",
    updatedAt: version,
    configurationState: "applied",
    validationErrors: [],
    usedFallback: false,
    active: { language: "en", direction: "ltr" },
    tracked: {
      density,
      densityActivated: true,
      categoryIds: [],
      categoriesActivated: true,
    },
  };
}

describe("RuntimeDisplayDensityManager", () => {
  const capabilities = kitchenDisplayRole.metadata.capabilities;

  it("maps large config to comfortable operational density", () => {
    const manager = new RuntimeDisplayDensityManager();
    const resolved = manager.syncFromConfiguration(mockConfiguration("large"), capabilities);
    expect(resolved.density).toBe("comfortable");
    expect(resolved.usedFallback).toBe(false);
    expect(manager.getPresentationModel()).toBe(COMFORTABLE_DENSITY_MODEL);
  });

  it("resolves compact density model", () => {
    const manager = new RuntimeDisplayDensityManager();
    const resolved = manager.syncFromConfiguration(mockConfiguration("compact"), capabilities);
    expect(resolved.density).toBe("compact");
    expect(manager.getPresentationModel()).toBe(COMPACT_DENSITY_MODEL);
  });

  it("falls back to comfortable for unknown density", () => {
    const manager = new RuntimeDisplayDensityManager();
    const config = mockConfiguration("large");
    config.tracked.density = "invalid" as "large";
    const resolved = manager.syncFromConfiguration(config, capabilities);
    expect(resolved.density).toBe("comfortable");
    expect(resolved.usedFallback).toBe(true);
    expect(resolved.validationErrors.length).toBeGreaterThan(0);
  });

  it("stays inactive for blocked roles without density capability", () => {
    const manager = new RuntimeDisplayDensityManager();
    const blockedCapabilities = { ...capabilities, supportsDensity: false };
    const resolved = manager.syncFromConfiguration(mockConfiguration("compact"), blockedCapabilities);
    expect(resolved.state).toBe("inactive");
    expect(manager.buildHealth()?.validationStatus).toBe("inactive");
  });

  it("rebuilds model on configuration version change", () => {
    const manager = new RuntimeDisplayDensityManager();
    manager.syncFromConfiguration(mockConfiguration("large", "v1"), capabilities);
    const v1 = manager.getDensity()?.version;
    manager.syncFromConfiguration(mockConfiguration("compact", "v2"), capabilities);
    const v2 = manager.getDensity()?.version;
    expect(v2).toBeGreaterThan(v1!);
    expect(manager.getPresentationModel()).toBe(COMPACT_DENSITY_MODEL);
    expect(manager.detectConfigurationChange("v3")).toBe(true);
  });

  it("reports density health", () => {
    const manager = new RuntimeDisplayDensityManager();
    manager.syncFromConfiguration(mockConfiguration("compact"), capabilities);
    const health = manager.buildHealth("v1");
    expect(health?.density).toBe("compact");
    expect(health?.configuredDensity).toBe("compact");
    expect(health?.densityVersion).toBeGreaterThan(0);
    expect(health?.validationStatus).toBe("valid");
  });
});
