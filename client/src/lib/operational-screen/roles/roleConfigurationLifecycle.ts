import type { RoleLifecycleHandlers } from "./runtimeRoleContract";
import type { RuntimeConfiguration } from "../configuration/runtimeConfigurationContract";
import { blockedRoleLifecycle } from "./runtimeRoleLifecycle";

export type RoleConfigurationState = {
  lastConfiguration: RuntimeConfiguration | null;
  configurationApplyCount: number;
};

function createConfigurationState(): RoleConfigurationState {
  return { lastConfiguration: null, configurationApplyCount: 0 };
}

/** Kitchen/Expo — receives normalized configuration; language/direction + category filter active. */
export function createOperationalRoleLifecycle(): RoleLifecycleHandlers & {
  getConfigurationState: () => RoleConfigurationState;
} {
  const configState = createConfigurationState();

  return {
    ...blockedRoleLifecycle,
    handleConfiguration(_ctx, configuration: RuntimeConfiguration) {
      configState.lastConfiguration = configuration;
      configState.configurationApplyCount += 1;
    },
    getConfigurationState: () => configState,
  };
}

/** Blocked roles — validate, store, report health; no capability activation. */
export function createBlockedRoleLifecycle(): RoleLifecycleHandlers & {
  getConfigurationState: () => RoleConfigurationState;
} {
  const configState = createConfigurationState();

  return {
    ...blockedRoleLifecycle,
    handleConfiguration(_ctx, configuration: RuntimeConfiguration) {
      configState.lastConfiguration = configuration;
      configState.configurationApplyCount += 1;
    },
    getConfigurationState: () => configState,
  };
}

export const operationalKitchenRoleLifecycle = createOperationalRoleLifecycle();
export const blockedRoleConfigurationLifecycle = createBlockedRoleLifecycle();
