import {
  DEFAULT_SCREEN_CONFIG,
  parseScreenConfig,
  type OperationalScreenConfig,
} from "../../../../../server/operational-device/domain/screenConfig";
import type { OperationalDeviceRole } from "../../../../../server/operational-device/domain/deviceRoles";
import type { RoleCapabilityDeclaration } from "../roles/runtimeRoleContract";
import type { RuntimeGetStatusResponse } from "../runtimeTypes";
import type {
  ConfigurationHealth,
  ConfigurationLifecycleState,
  RuntimeConfiguration,
} from "./runtimeConfigurationContract";

export type ConfigurationManagerSnapshot = {
  configuration: RuntimeConfiguration | null;
  lastAppliedVersion: string | null;
  lastReloadAt: string | null;
};

function validateRawPayload(raw: unknown): string[] {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") {
    return ["invalid_payload"];
  }
  const value = raw as Partial<OperationalScreenConfig>;
  if (value.language != null && value.language !== "ar" && value.language !== "en") {
    errors.push("invalid_language");
  }
  if (
    value.displayDirection != null &&
    value.displayDirection !== "rtl" &&
    value.displayDirection !== "ltr"
  ) {
    errors.push("invalid_direction");
  }
  if (
    value.displayDensity != null &&
    value.displayDensity !== "large" &&
    value.displayDensity !== "comfortable" &&
    value.displayDensity !== "compact"
  ) {
    errors.push("invalid_density");
  }
  if (value.visibleCategoryIds != null && !Array.isArray(value.visibleCategoryIds)) {
    errors.push("invalid_category_ids");
  }
  return errors;
}

function negotiateTrackedFields(
  parsed: OperationalScreenConfig,
  capabilities: RoleCapabilityDeclaration
): RuntimeConfiguration["tracked"] {
  return {
    density: capabilities.supportsDensity ? parsed.displayDensity : DEFAULT_SCREEN_CONFIG.displayDensity,
    densityActivated: false,
    categoryIds: capabilities.supportsCategoryFilter
      ? parsed.visibleCategoryIds
      : DEFAULT_SCREEN_CONFIG.visibleCategoryIds,
    categoriesActivated: false,
  };
}

function buildRuntimeConfiguration(input: {
  raw: OperationalScreenConfig;
  role: OperationalDeviceRole;
  version: string;
  capabilities: RoleCapabilityDeclaration;
  configurationState: ConfigurationLifecycleState;
  validationErrors: string[];
  usedFallback: boolean;
}): RuntimeConfiguration {
  const parsed = parseScreenConfig(input.raw);
  const activeSource = input.usedFallback ? DEFAULT_SCREEN_CONFIG : parsed;

  return {
    version: input.version,
    role: input.role,
    updatedAt: input.version,
    configurationState: input.configurationState,
    validationErrors: input.validationErrors,
    usedFallback: input.usedFallback,
    active: {
      language: activeSource.language,
      direction: activeSource.displayDirection,
    },
    tracked: negotiateTrackedFields(parsed, input.capabilities),
  };
}

/**
 * SCREEN-CONFIG-RUNTIME-1 — single runtime configuration pipeline.
 * Load → Validate → Normalize → Cache → Publish → Version detect → Notify.
 */
export class RuntimeConfigurationManager {
  private configuration: RuntimeConfiguration | null = null;
  private lastAppliedVersion: string | null = null;
  private lastReloadAt: string | null = null;

  loadFromStatus(
    status: RuntimeGetStatusResponse,
    capabilities: RoleCapabilityDeclaration
  ): RuntimeConfiguration {
    const role = status.device.role;
    const version = status.configVersion;
    const raw = status.screenConfig ?? { ...DEFAULT_SCREEN_CONFIG };

    const validating = this.normalize(role, version, raw, capabilities, "validating");
    const validationErrors = validateRawPayload(raw);
    const usedFallback = validationErrors.length > 0;
    const applied = buildRuntimeConfiguration({
      raw,
      role,
      version,
      capabilities,
      configurationState: usedFallback ? "invalid" : "valid",
      validationErrors,
      usedFallback,
    });
    applied.configurationState = "applied";

    this.configuration = applied;
    this.lastAppliedVersion = version;
    return applied;
  }

  reloadFromStatus(
    status: RuntimeGetStatusResponse,
    capabilities: RoleCapabilityDeclaration
  ): RuntimeConfiguration | null {
    const incomingVersion = status.configVersion;
    if (this.lastAppliedVersion === incomingVersion && this.configuration) {
      return null;
    }

    this.configuration = {
      ...this.configuration!,
      configurationState: "reloading",
    };

    const raw = status.screenConfig ?? { ...DEFAULT_SCREEN_CONFIG };
    const role = status.device.role;
    const validationErrors = validateRawPayload(raw);
    const usedFallback = validationErrors.length > 0;
    const reloaded = buildRuntimeConfiguration({
      raw,
      role,
      version: incomingVersion,
      capabilities,
      configurationState: "reloading",
      validationErrors,
      usedFallback,
    });
    reloaded.configurationState = "applied";

    this.configuration = reloaded;
    this.lastAppliedVersion = incomingVersion;
    this.lastReloadAt = new Date().toISOString();
    return reloaded;
  }

  private normalize(
    role: OperationalDeviceRole,
    version: string,
    raw: OperationalScreenConfig,
    capabilities: RoleCapabilityDeclaration,
    state: ConfigurationLifecycleState
  ): RuntimeConfiguration {
    const validationErrors = validateRawPayload(raw);
    const usedFallback = validationErrors.length > 0;
    return buildRuntimeConfiguration({
      raw,
      role,
      version,
      capabilities,
      configurationState: state,
      validationErrors,
      usedFallback,
    });
  }

  detectVersionChange(incomingVersion: string): boolean {
    return this.lastAppliedVersion != null && this.lastAppliedVersion !== incomingVersion;
  }

  publish(configuration: RuntimeConfiguration): void {
    this.configuration = configuration;
    this.lastAppliedVersion = configuration.version;
  }

  getConfiguration(): RuntimeConfiguration | null {
    return this.configuration;
  }

  getSnapshot(): ConfigurationManagerSnapshot {
    return {
      configuration: this.configuration,
      lastAppliedVersion: this.lastAppliedVersion,
      lastReloadAt: this.lastReloadAt,
    };
  }

  buildHealth(incomingVersion?: string): ConfigurationHealth | null {
    if (!this.configuration) return null;
    const appliedVersion = this.lastAppliedVersion;
    const configurationVersion = incomingVersion ?? this.configuration.version;
    return {
      configurationState: this.configuration.configurationState,
      configurationVersion,
      appliedVersion,
      versionMismatch:
        appliedVersion != null &&
        incomingVersion != null &&
        appliedVersion !== incomingVersion,
      validationErrors: this.configuration.validationErrors,
      usedFallback: this.configuration.usedFallback,
      lastReloadAt: this.lastReloadAt,
    };
  }

  dispose(): void {
    if (this.configuration) {
      this.configuration = { ...this.configuration, configurationState: "disposed" };
    }
    this.lastAppliedVersion = null;
  }
}
