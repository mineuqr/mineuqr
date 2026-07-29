/**
 * DEVICE-MANAGEMENT-PLATFORM-ARCHITECTURE-2
 * Shared Device Management Platform architecture barrel.
 * Architecture only — no provisioning, remote management, updates, or runtime.
 */

export {
  DEVICE_MANAGEMENT_PLATFORM_PROGRAM,
  DEVICE_PLATFORM_DOMAINS,
  DEVICE_PLATFORM_DOMAIN_DEFINITIONS,
  type DevicePlatformDomainId,
  type DevicePlatformDomainMaturity,
  type DevicePlatformDomainDefinition,
} from "./domains";

export {
  DEVICE_PLATFORM_OWNS,
  DEVICE_PLATFORM_DOES_NOT_OWN,
  DEVICE_ARCHITECTURE_PRINCIPLES,
  type DevicePlatformOwns,
  type DevicePlatformDoesNotOwn,
} from "./ownership";

export {
  DEVICE_TYPES,
  DEVICE_TYPE_ARCHITECTURE,
  type DeviceTypeId,
  type DeviceTypeArchitecture,
} from "./deviceTypes";

export {
  DEVICE_IDENTITY_FIELDS,
  DEVICE_IDENTITY_ARCHITECTURE,
  type DeviceIdentityFieldId,
  type DeviceIdentityFieldArchitecture,
} from "./identity";

export {
  DEVICE_LIFECYCLE_STATES,
  DEVICE_LIFECYCLE_ARCHITECTURE,
  DEVICE_REGISTRATION_SUPPORTS_RE_REGISTRATION,
  type DeviceLifecycleStateId,
  type DeviceLifecycleStateArchitecture,
} from "./lifecycle";

export {
  DEVICE_PROVISIONING_CAPABILITIES,
  DEVICE_PROVISIONING_ARCHITECTURE,
  DEVICE_UPDATE_STATES,
  DEVICE_UPDATE_ARCHITECTURE,
  type DeviceProvisioningCapabilityId,
  type DeviceProvisioningArchitecture,
  type DeviceUpdateStateId,
  type DeviceUpdateArchitecture,
} from "./provisioning";

export {
  DEVICE_ASSIGNMENT_TARGETS,
  DEVICE_ASSIGNMENT_ARCHITECTURE,
  type DeviceAssignmentTargetId,
  type DeviceAssignmentArchitecture,
} from "./assignment";

export {
  DEVICE_CONFIGURATION_KEYS,
  DEVICE_CONFIGURATION_ARCHITECTURE,
  type DeviceConfigurationKeyId,
  type DeviceConfigurationArchitecture,
} from "./configuration";

export {
  DEVICE_HEALTH_STATUSES,
  DEVICE_HEALTH_RULE_ARCHITECTURE,
  type DeviceHealthStatus,
  type DeviceHealthRuleArchitecture,
} from "./health";

export {
  DEVICE_CONNECTIVITY_SIGNALS,
  DEVICE_CONNECTIVITY_ARCHITECTURE,
  type DeviceConnectivitySignalId,
  type DeviceConnectivityArchitecture,
} from "./connectivity";

export {
  DEVICE_INVENTORY_FACETS,
  DEVICE_INVENTORY_ARCHITECTURE,
  type DeviceInventoryFacetId,
  type DeviceInventoryArchitecture,
} from "./inventory";

export {
  DEVICE_DIAGNOSTIC_CAPABILITIES,
  DEVICE_DIAGNOSTICS_ARCHITECTURE,
  type DeviceDiagnosticCapabilityId,
  type DeviceDiagnosticArchitecture,
} from "./diagnostics";

export {
  DEVICE_SECURITY_CAPABILITIES,
  DEVICE_SECURITY_ARCHITECTURE,
  DEVICE_SECURITY_DOES_NOT_REDESIGN,
  type DeviceSecurityCapabilityId,
  type DeviceSecurityArchitecture,
} from "./security";

export {
  DEVICE_DASHBOARD_SECTIONS,
  DEVICE_DASHBOARD_ARCHITECTURE,
  DEVICE_DASHBOARD_HOST_PATH,
  type DeviceDashboardSectionId,
  type DeviceDashboardSectionArchitecture,
} from "./dashboard";

export {
  DEVICE_INTEGRATION_MATRIX,
  type DeviceIntegrationMode,
  type DeviceIntegrationDefinition,
} from "./integrations";
