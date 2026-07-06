import type { DisplayDensity } from "../../../../../server/operational-device/domain/screenConfig";
import type { RuntimeConfiguration } from "../configuration/runtimeConfigurationContract";
import type { RoleCapabilityDeclaration } from "../roles/runtimeRoleContract";
import type {
  CanonicalDisplayDensity,
  DisplayDensityHealth,
  PresentationDensityModel,
  RuntimeDisplayDensity,
} from "./runtimeDisplayDensityContract";
import {
  resolveDensityMetrics,
  resolvePresentationDensityModel,
} from "./presentationDensityModels";

export type DisplayDensityManagerSnapshot = {
  density: RuntimeDisplayDensity | null;
  model: PresentationDensityModel;
  lastUpdatedAt: string | null;
};

function normalizeConfiguredDensity(raw: DisplayDensity): {
  density: CanonicalDisplayDensity;
  usedFallback: boolean;
  errors: string[];
} {
  switch (raw) {
    case "compact":
      return { density: "compact", usedFallback: false, errors: [] };
    case "comfortable":
    case "large":
      return { density: "comfortable", usedFallback: false, errors: [] };
    default:
      return {
        density: "comfortable",
        usedFallback: true,
        errors: [`unknown_density:${String(raw)}`],
      };
  }
}

/**
 * KITCHEN-DISPLAY-DENSITY-1 — single runtime display density pipeline.
 * Load → Validate → Normalize → Resolve metrics → Cache → Publish.
 */
export class RuntimeDisplayDensityManager {
  private density: RuntimeDisplayDensity | null = null;
  private model: PresentationDensityModel = resolvePresentationDensityModel("comfortable");
  private densityVersionCounter = 0;
  private lastUpdatedAt: string | null = null;
  private lastAppliedConfigurationVersion: string | null = null;
  private activated = false;

  syncFromConfiguration(
    configuration: RuntimeConfiguration,
    capabilities: RoleCapabilityDeclaration
  ): RuntimeDisplayDensity {
    const canActivate =
      capabilities.supportsDensity && configuration.tracked.densityActivated;

    if (!canActivate) {
      return this.publishInactive(configuration.version);
    }

    const { density, usedFallback, errors } = normalizeConfiguredDensity(
      configuration.tracked.density
    );
    const metrics = resolveDensityMetrics(density);

    this.densityVersionCounter += 1;
    const resolved: RuntimeDisplayDensity = {
      version: this.densityVersionCounter,
      density,
      layoutScale: metrics.layoutScale,
      spacingScale: metrics.spacingScale,
      fontScale: metrics.fontScale,
      ticketDensity: metrics.ticketDensity,
      updatedAt: new Date().toISOString(),
      state: "applied",
      configurationVersion: configuration.version,
      configuredDensity: configuration.tracked.density,
      usedFallback,
      validationErrors: errors,
    };

    this.density = resolved;
    this.model = resolvePresentationDensityModel(density);
    this.lastUpdatedAt = resolved.updatedAt;
    this.lastAppliedConfigurationVersion = configuration.version;
    this.activated = true;
    return resolved;
  }

  private publishInactive(configurationVersion: string): RuntimeDisplayDensity {
    const resolved: RuntimeDisplayDensity = {
      version: this.densityVersionCounter,
      density: "comfortable",
      layoutScale: 1,
      spacingScale: 1,
      fontScale: 1,
      ticketDensity: 1,
      updatedAt: new Date().toISOString(),
      state: "inactive",
      configurationVersion,
      configuredDensity: "large",
      usedFallback: false,
      validationErrors: [],
    };
    this.density = resolved;
    this.model = resolvePresentationDensityModel("comfortable");
    this.lastUpdatedAt = resolved.updatedAt;
    this.activated = false;
    return resolved;
  }

  detectConfigurationChange(configurationVersion: string): boolean {
    return (
      this.lastAppliedConfigurationVersion != null &&
      this.lastAppliedConfigurationVersion !== configurationVersion
    );
  }

  getDensity(): RuntimeDisplayDensity | null {
    return this.density;
  }

  getPresentationModel(): PresentationDensityModel {
    return this.model;
  }

  getSnapshot(): DisplayDensityManagerSnapshot {
    return {
      density: this.density,
      model: this.model,
      lastUpdatedAt: this.lastUpdatedAt,
    };
  }

  isActivated(): boolean {
    return this.activated;
  }

  buildHealth(incomingVersion?: string): DisplayDensityHealth | null {
    if (!this.density) return null;
    const hasWarnings = this.density.validationErrors.length > 0 || this.density.usedFallback;

    return {
      density: this.density.density,
      configuredDensity: this.density.configuredDensity,
      densityVersion: this.density.version,
      configurationVersion: incomingVersion ?? this.density.configurationVersion,
      appliedVersion: this.lastAppliedConfigurationVersion,
      validationStatus: !this.activated ? "inactive" : hasWarnings ? "warning" : "valid",
      validationErrors: this.density.validationErrors,
      usedFallback: this.density.usedFallback,
      lastReloadAt: this.lastUpdatedAt,
    };
  }

  dispose(): void {
    if (this.density) {
      this.density = { ...this.density, state: "disposed" };
    }
    this.activated = false;
    this.lastAppliedConfigurationVersion = null;
  }
}
