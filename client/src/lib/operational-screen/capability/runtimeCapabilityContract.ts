import type { OperationalDeviceRole } from "../../../../../server/operational-device/domain/deviceRoles";

/** Canonical capability identifiers. */
export type CapabilityId =
  | "category_filtering"
  | "display_density"
  | "configuration"
  | "health"
  | "diagnostics"
  | "provisioning"
  | "kitchen_queue"
  | "print_monitor"
  | "presentation_tickets"
  | "presentation_kiosk";

export const ALL_CAPABILITY_IDS: CapabilityId[] = [
  "category_filtering",
  "display_density",
  "configuration",
  "health",
  "diagnostics",
  "provisioning",
  "kitchen_queue",
  "print_monitor",
  "presentation_tickets",
  "presentation_kiosk",
];

/** Canonical negotiation result — no booleans. */
export type NegotiationResult =
  | "supported"
  | "unsupported"
  | "blocked"
  | "unavailable"
  | "deprecated";

export type CapabilityAdapter = {
  capabilityId: CapabilityId;
  status: NegotiationResult;
  metadata: Record<string, unknown>;
  actions: string[];
  configuration: Record<string, unknown> | null;
  state: Record<string, unknown> | null;
  providerSource: string;
  version: number;
};

export type CapabilityNegotiationSummary = {
  supported: CapabilityId[];
  unsupported: CapabilityId[];
  blocked: CapabilityId[];
  unavailable: CapabilityId[];
  deprecated: CapabilityId[];
  failures: Array<{ capabilityId: CapabilityId; reason: string }>;
};

/**
 * RUNTIME-CAPABILITY-NEGOTIATION-1 — public runtime capability contract.
 * The only capability surface exposed to workspaces and presentation.
 */
export type RuntimeCapabilityContract = {
  runtimeVersion: string;
  role: OperationalDeviceRole;
  capabilities: Record<CapabilityId, CapabilityAdapter>;
  supportedFeatures: CapabilityId[];
  configurationSupport: NegotiationResult;
  presentationSupport: NegotiationResult;
  healthSupport: NegotiationResult;
  diagnosticsSupport: NegotiationResult;
  version: number;
  updatedAt: string;
  negotiationSummary: CapabilityNegotiationSummary;
};

export type CapabilityNegotiationInput = {
  role: OperationalDeviceRole;
  runtimeVersion: string;
  configurationActivated: boolean;
  densityActivated: boolean;
  categoriesActivated: boolean;
  canAccessKitchenQueue: boolean;
  canAccessPrintMonitor: boolean;
  operationalBlocked: boolean;
  deviceDisabled: boolean;
};
