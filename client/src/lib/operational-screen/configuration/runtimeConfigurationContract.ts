import type {
  DisplayDensity,
  DisplayDirection,
  ScreenLanguage,
} from "../../../../../server/operational-device/domain/screenConfig";
import type { OperationalDeviceRole } from "../../../../../server/operational-device/domain/deviceRoles";

/** Configuration lifecycle — independent from bootstrap lifecycle. */
export type ConfigurationLifecycleState =
  | "loading"
  | "validating"
  | "valid"
  | "invalid"
  | "pending"
  | "applied"
  | "reloading"
  | "disposed";

/** Active configuration consumed by presentation (language/direction only in this program). */
export type RuntimeConfigurationActive = {
  language: ScreenLanguage;
  direction: DisplayDirection;
};

/** Tracked but not activated — density/categories deferred to future programs. */
export type RuntimeConfigurationTracked = {
  density: DisplayDensity;
  densityActivated: false;
  categoryIds: number[];
  categoriesActivated: false;
};

/**
 * Normalized runtime configuration contract.
 * Runtime never exposes raw API payloads outside the configuration manager.
 */
export type RuntimeConfiguration = {
  version: string;
  role: OperationalDeviceRole;
  updatedAt: string;
  configurationState: ConfigurationLifecycleState;
  validationErrors: string[];
  usedFallback: boolean;
  active: RuntimeConfigurationActive;
  tracked: RuntimeConfigurationTracked;
};

export type ConfigurationHealth = {
  configurationState: ConfigurationLifecycleState;
  configurationVersion: string;
  appliedVersion: string | null;
  versionMismatch: boolean;
  validationErrors: string[];
  usedFallback: boolean;
  lastReloadAt: string | null;
};
