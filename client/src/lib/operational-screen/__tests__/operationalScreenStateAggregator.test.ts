import { describe, expect, it } from "vitest";
import {
  OperationalScreenStateAggregator,
  resolveOperationalState,
  type StateAggregatorInput,
} from "../state/operationalScreenStateAggregator";
import { kitchenDisplayRole } from "../roles/roleDefinitions";

function baseInput(overrides: Partial<StateAggregatorInput> = {}): StateAggregatorInput {
  return {
    bootstrapPhase: "running",
    roleRuntimeState: "operational",
    roleOperational: true,
    roleBlockedReason: null,
    runtimeConfiguration: {
      version: "v1",
      role: "kitchen_display",
      updatedAt: "v1",
      configurationState: "applied",
      validationErrors: [],
      usedFallback: false,
      active: { language: "en", direction: "ltr" },
      tracked: {
        density: "large",
        densityActivated: true,
        categoryIds: [],
        categoriesActivated: true,
      },
    },
    configurationHealth: {
      configurationState: "applied",
      configurationVersion: "v1",
      appliedVersion: "v1",
      versionMismatch: false,
      validationErrors: [],
      usedFallback: false,
      lastReloadAt: null,
    },
    densityState: "applied",
    displayDensity: "comfortable",
    displayDensityHealth: {
      density: "comfortable",
      configuredDensity: "large",
      densityVersion: 1,
      configurationVersion: "v1",
      appliedVersion: "v1",
      validationStatus: "valid",
      validationErrors: [],
      usedFallback: false,
      lastReloadAt: null,
    },
    categoryFilterHealth: {
      filterEnabled: false,
      selectedCategoryCount: 0,
      configurationVersion: "v1",
      filterVersion: 0,
      validationStatus: "inactive",
      validationErrors: [],
      ignoredCategories: [],
      missingCategoryData: false,
      lastUpdatedAt: null,
    },
    reconnecting: false,
    degraded: false,
    lastError: null,
    deviceStatus: "active",
    hasActiveToken: true,
    ...overrides,
  };
}

describe("OperationalScreenStateAggregator", () => {
  it("aggregates canonical screen state", () => {
    const aggregator = new OperationalScreenStateAggregator();
    const state = aggregator.aggregate(baseInput());
    expect(state.operationalState).toBe("operational");
    expect(state.connectivityState).toBe("connected");
    expect(state.businessReadiness).toBe("ready");
    expect(state.version).toBeGreaterThan(0);
  });

  it("blocked role reports blocked operational state", () => {
    const aggregator = new OperationalScreenStateAggregator();
    const state = aggregator.aggregate(
      baseInput({
        bootstrapPhase: "blocked",
        roleOperational: false,
        roleRuntimeState: "blocked",
        roleBlockedReason: { en: "Blocked", ar: "محجوب" },
      })
    );
    expect(state.operationalState).toBe("blocked");
    expect(state.businessReadiness).toBe("role_unavailable");
    expect(state.blockedReason?.en).toBe("Blocked");
  });

  it("configuration invalid with runtime running yields degraded", () => {
    const state = resolveOperationalState(
      baseInput({
        runtimeConfiguration: {
          ...baseInput().runtimeConfiguration,
          configurationState: "invalid",
          usedFallback: true,
        },
      }),
      "connected",
      "normal",
      [{ code: "fallback_configuration", message: "fallback", severity: "medium" }]
    );
    expect(state).toBe("degraded");
  });

  it("precedence: disposed over operational", () => {
    const aggregator = new OperationalScreenStateAggregator();
    const state = aggregator.aggregate(
      baseInput({ bootstrapPhase: "revoked", roleRuntimeState: "disposed" })
    );
    expect(state.operationalState).toBe("disposed");
    expect(state.connectivityState).toBe("offline");
    expect(state.businessReadiness).toBe("pairing_required");
  });

  it("precedence: maintenance before blocked", () => {
    const aggregator = new OperationalScreenStateAggregator();
    const state = aggregator.aggregate(
      baseInput({
        deviceStatus: "disabled",
        bootstrapPhase: "blocked",
        roleOperational: false,
      })
    );
    expect(state.operationalState).toBe("maintenance");
    expect(state.maintenanceState).toBe("maintenance");
  });

  it("collects density fallback warning", () => {
    const aggregator = new OperationalScreenStateAggregator();
    const state = aggregator.aggregate(
      baseInput({
        displayDensityHealth: {
          ...baseInput().displayDensityHealth!,
          usedFallback: true,
          validationStatus: "warning",
        },
      })
    );
    expect(state.warnings.some((w) => w.code === "fallback_density")).toBe(true);
  });

  it("kitchen and expo use identical state model", () => {
    const aggregator = new OperationalScreenStateAggregator();
    const kitchen = aggregator.aggregate(baseInput({ runtimeConfiguration: { ...baseInput().runtimeConfiguration, role: "kitchen_display" } }));
    const expo = aggregator.aggregate(baseInput({
      runtimeConfiguration: { ...baseInput().runtimeConfiguration, role: "expo_display" },
      roleOperational: true,
    }));
    expect(kitchen.operationalState).toBe("operational");
    expect(expo.operationalState).toBe("operational");
    expect(kitchenDisplayRole.metadata.operational).toBe(true);
  });
});
