/** REBUILD-5F — Health platform domain type contracts. */

export type HealthDomainId = "health";

export type HealthAssetCategory =
  | "diagnostics"
  | "runtime"
  | "monitoring"
  | "signals"
  | "reliability"
  | "readiness-input"
  | "platform"
  | "email"
  | "database"
  | "api"
  | "helper"
  | "server"
  | "page";

/** Modules Health produces; Launch Readiness consumes (not Health-owned). */
export type LaunchReadinessHealthInputId =
  | "input-email-health-probe"
  | "input-ops-signal-stream"
  | "input-runtime-health-signals"
  | "input-trpc-pressure-signals";

export type HealthAssetId =
  | "diagnostics-page"
  | "diagnostics-entitlements-panel"
  | "diagnostics-runtime-status"
  | "diagnostics-gate-consolidation"
  | "diagnostics-visibility-trace"
  | "platform-health-indicators"
  | "operational-diagnostics"
  | "hook-commercial-entitlements"
  | "helper-client-gate-registry"
  | "server-email-health-probe"
  | "server-ops-signal-metadata"
  | "server-ops-taxonomy"
  | "server-ops-log"
  | "server-health-signals"
  | "server-ops-signal-guide"
  | "server-database-cascade-probe"
  | "monitoring-signals"
  | "reliability-indicators"
  | "health-readiness-inputs"
  | "input-email-health-probe"
  | "input-ops-signal-stream"
  | "input-runtime-health-signals"
  | "input-trpc-pressure-signals";

export type HealthSurfaceId = "diagnostics" | "infrastructure" | "monitoring";

export type HealthAssetDefinition = {
  id: HealthAssetId;
  category: HealthAssetCategory;
  /** Primary component or module path. */
  ownerPath: string;
  /** tRPC procedure when applicable. */
  queryKey?: string;
  /** Routes or cross-cutting surfaces where this asset applies today. */
  surfaces: HealthSurfaceId[];
  /** When true, asset is a signal input consumed by Launch Readiness — not merged ownership. */
  launchReadinessInput?: boolean;
};
