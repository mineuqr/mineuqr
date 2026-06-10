import type { HealthAssetDefinition, LaunchReadinessHealthInputId } from "./healthTypes";

export const HEALTH_DOMAIN_ID = "health" as const;

/** REBUILD-5F — canonical Health domain asset registry (ownership metadata). */
export const HEALTH_ASSET_DEFINITIONS: HealthAssetDefinition[] = [
  // ── Diagnostics page & panels ──
  {
    id: "diagnostics-page",
    category: "page",
    ownerPath: "pages/CommercialDiagnostics",
    surfaces: ["diagnostics"],
  },
  {
    id: "operational-diagnostics",
    category: "diagnostics",
    ownerPath: "components/admin/domains/health/HealthDiagnosticsSection",
    queryKey: "commercial.getEntitlements",
    surfaces: ["diagnostics"],
  },
  {
    id: "diagnostics-entitlements-panel",
    category: "diagnostics",
    ownerPath: "components/admin/domains/health/HealthDiagnosticsSection",
    queryKey: "commercial.getEntitlements",
    surfaces: ["diagnostics"],
  },
  {
    id: "diagnostics-runtime-status",
    category: "runtime",
    ownerPath: "components/admin/domains/health/HealthRuntimeSection",
    surfaces: ["diagnostics"],
  },
  {
    id: "platform-health-indicators",
    category: "platform",
    ownerPath: "components/admin/domains/health/HealthRuntimeSection",
    surfaces: ["diagnostics"],
  },
  {
    id: "diagnostics-gate-consolidation",
    category: "monitoring",
    ownerPath: "components/admin/domains/health/HealthMonitoringSection",
    surfaces: ["diagnostics"],
  },
  {
    id: "diagnostics-visibility-trace",
    category: "reliability",
    ownerPath: "components/admin/domains/health/HealthReliabilitySection",
    surfaces: ["diagnostics"],
  },
  {
    id: "hook-commercial-entitlements",
    category: "helper",
    ownerPath: "hooks/useCommercialEntitlements",
    queryKey: "commercial.getEntitlements",
    surfaces: ["diagnostics"],
  },
  {
    id: "helper-client-gate-registry",
    category: "helper",
    ownerPath: "lib/commercial/clientGateRegistry.ts",
    surfaces: ["diagnostics"],
  },
  {
    id: "monitoring-signals",
    category: "monitoring",
    ownerPath: "components/admin/domains/health/HealthSignalsSection",
    surfaces: ["monitoring", "infrastructure"],
  },
  {
    id: "reliability-indicators",
    category: "reliability",
    ownerPath: "components/admin/domains/health/HealthReliabilitySection",
    surfaces: ["diagnostics"],
  },

  // ── Server probes & signal infrastructure ──
  {
    id: "server-email-health-probe",
    category: "email",
    ownerPath: "server/email-config.test.ts",
    surfaces: ["infrastructure"],
  },
  {
    id: "server-ops-signal-metadata",
    category: "server",
    ownerPath: "server/_core/authOpsMetadata.ts",
    surfaces: ["infrastructure", "monitoring"],
  },
  {
    id: "server-ops-taxonomy",
    category: "server",
    ownerPath: "server/_core/opsTaxonomy.ts",
    surfaces: ["infrastructure", "monitoring"],
  },
  {
    id: "server-ops-log",
    category: "server",
    ownerPath: "server/_core/opsLog.ts",
    surfaces: ["infrastructure", "monitoring"],
  },
  {
    id: "server-health-signals",
    category: "server",
    ownerPath: "server/_core/healthSignals.ts",
    surfaces: ["infrastructure", "monitoring"],
  },
  {
    id: "server-ops-signal-guide",
    category: "server",
    ownerPath: "server/_core/authOpsSignalGuide.ts",
    surfaces: ["infrastructure", "monitoring"],
  },
  {
    id: "server-database-cascade-probe",
    category: "database",
    ownerPath: "server/db/cascadeDeletes.test.ts",
    surfaces: ["infrastructure"],
  },

  // ── Readiness inputs (Health produces; Launch Readiness consumes) ──
  {
    id: "health-readiness-inputs",
    category: "readiness-input",
    ownerPath: "components/admin/domains/health/HealthReadinessInputsSection",
    surfaces: ["infrastructure"],
  },
  {
    id: "input-email-health-probe",
    category: "readiness-input",
    ownerPath: "server/email-config.test.ts",
    surfaces: ["infrastructure"],
    launchReadinessInput: true,
  },
  {
    id: "input-ops-signal-stream",
    category: "readiness-input",
    ownerPath: "server/_core/opsLog.ts",
    surfaces: ["infrastructure"],
    launchReadinessInput: true,
  },
  {
    id: "input-runtime-health-signals",
    category: "readiness-input",
    ownerPath: "server/_core/healthSignals.ts",
    surfaces: ["infrastructure"],
    launchReadinessInput: true,
  },
  {
    id: "input-trpc-pressure-signals",
    category: "readiness-input",
    ownerPath: "server/_core/healthSignals.ts",
    surfaces: ["infrastructure"],
    launchReadinessInput: true,
  },
];

/** Signal inputs produced by Health and consumed by Launch Readiness — not merged ownership. */
export const LAUNCH_READINESS_HEALTH_INPUTS: LaunchReadinessHealthInputId[] = [
  "input-email-health-probe",
  "input-ops-signal-stream",
  "input-runtime-health-signals",
  "input-trpc-pressure-signals",
];

export const HEALTH_COMPOSITION_SECTIONS = [
  "HealthDiagnosticsSection",
  "HealthRuntimeSection",
  "HealthMonitoringSection",
  "HealthReliabilitySection",
  "HealthSignalsSection",
  "HealthReadinessInputsSection",
] as const;
