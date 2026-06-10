# REBUILD-5FB — Health Ownership Adoption

**Program:** ADMIN-DASHBOARD-REBUILD-5F  
**Phase:** 5FB — Health Asset Adoption

---

## Registered Health Assets (REBUILD-5B → 5F)

### Diagnostics & runtime (client)

| Asset ID | Owner path | Surface |
|----------|------------|---------|
| `diagnostics-page` | `pages/CommercialDiagnostics` | `/commercial/diagnostics` |
| `operational-diagnostics` | `HealthDiagnosticsSection` | Diagnostics page |
| `diagnostics-entitlements-panel` | `HealthDiagnosticsSection` | Diagnostics page |
| `diagnostics-runtime-status` | `HealthRuntimeSection` | Diagnostics page |
| `platform-health-indicators` | `HealthRuntimeSection` | Diagnostics page |
| `diagnostics-gate-consolidation` | `HealthMonitoringSection` | Diagnostics page |
| `diagnostics-visibility-trace` | `HealthReliabilitySection` | Diagnostics page |
| `reliability-indicators` | `HealthReliabilitySection` | Diagnostics page |
| `hook-commercial-entitlements` | `useHealthCommercialDiagnosticsData` | Diagnostics data |
| `helper-client-gate-registry` | `lib/commercial/clientGateRegistry.ts` | Gate monitoring |

### Server probes & monitoring

| Asset ID | Module |
|----------|--------|
| `server-email-health-probe` | `server/email-config.test.ts` |
| `server-ops-signal-metadata` | `server/_core/authOpsMetadata.ts` |
| `server-ops-taxonomy` | `server/_core/opsTaxonomy.ts` |
| `server-ops-log` | `server/_core/opsLog.ts` |
| `server-health-signals` | `server/_core/healthSignals.ts` |
| `server-ops-signal-guide` | `server/_core/authOpsSignalGuide.ts` |
| `server-database-cascade-probe` | `server/db/cascadeDeletes.test.ts` |
| `monitoring-signals` | `HealthSignalsSection` |

### Readiness inputs (Health produces → Launch Readiness consumes)

| Asset ID | Module |
|----------|--------|
| `input-email-health-probe` | `server/email-config.test.ts` |
| `input-ops-signal-stream` | `server/_core/opsLog.ts` |
| `input-runtime-health-signals` | `server/_core/healthSignals.ts` |
| `input-trpc-pressure-signals` | `server/_core/healthSignals.ts` |

---

## Explicit Non-Ownership (unchanged)

| Asset | Owner domain |
|-------|--------------|
| `deploymentReadiness` | Launch Readiness |
| `featureVisibility` inventory | Launch Readiness |
| `getExtendedStats` | Reports |
| `CommercialOverviewSubscriptionHealth` | Customer Success |

---

## Single Owner Rule

Every health asset has exactly one Health domain owner in `HEALTH_ASSET_DEFINITIONS`. No shared ownership with Launch Readiness, Security, or Customer Success.
