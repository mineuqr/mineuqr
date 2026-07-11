import type {
  FrozenRuntimeInstanceContext,
  RuntimeInstanceBusiness,
  RuntimeInstanceCapabilities,
  RuntimeInstanceConfiguration,
  RuntimeInstanceDevice,
  RuntimeInstanceIdentity,
  RuntimeInstanceMetadata,
  RuntimeInstanceRole,
  RuntimeInstanceSession,
} from "./runtimeInstanceContext";

export type RuntimeIdentitySelector = RuntimeInstanceIdentity;

export type RuntimeBusinessSelector = Pick<
  RuntimeInstanceBusiness,
  "businessName" | "tenantId" | "timezone" | "currency" | "language"
>;

export type RuntimeDeviceSelector = RuntimeInstanceDevice;

export type RuntimeRoleSelector = RuntimeInstanceRole;

export type RuntimeConfigurationSelector = RuntimeInstanceConfiguration;

export type RuntimeCapabilitiesSelector = Pick<
  RuntimeInstanceCapabilities,
  "supportedActions" | "supportedEvents" | "supportedViews" | "supportedPrinting"
>;

export type RuntimeSessionSelector = RuntimeInstanceSession;

export type RuntimeMetadataSelector = RuntimeInstanceMetadata;

/** RUNTIME-CONTEXT-SELECTORS-1 — pure read facades over RuntimeInstanceContext. */
export function selectRuntimeIdentity(
  context: FrozenRuntimeInstanceContext
): RuntimeIdentitySelector {
  return context.identity;
}

export function selectRuntimeBusiness(
  context: FrozenRuntimeInstanceContext
): RuntimeBusinessSelector {
  return {
    businessName: context.business.businessName,
    tenantId: context.business.tenantId,
    timezone: context.business.timezone,
    currency: context.business.currency,
    language: context.business.language,
  };
}

export function selectRuntimeDevice(context: FrozenRuntimeInstanceContext): RuntimeDeviceSelector {
  return context.device;
}

export function selectRuntimeRole(context: FrozenRuntimeInstanceContext): RuntimeRoleSelector {
  return context.role;
}

export function selectRuntimeConfiguration(
  context: FrozenRuntimeInstanceContext
): RuntimeConfigurationSelector {
  return context.configuration;
}

export function selectRuntimeCapabilities(
  context: FrozenRuntimeInstanceContext
): RuntimeCapabilitiesSelector {
  return {
    supportedActions: context.capabilities.supportedActions,
    supportedEvents: context.capabilities.supportedEvents,
    supportedViews: context.capabilities.supportedViews,
    supportedPrinting: context.capabilities.supportedPrinting,
  };
}

export function selectRuntimeSession(context: FrozenRuntimeInstanceContext): RuntimeSessionSelector {
  return context.session;
}

export function selectRuntimeMetadata(
  context: FrozenRuntimeInstanceContext
): RuntimeMetadataSelector {
  return context.metadata;
}
