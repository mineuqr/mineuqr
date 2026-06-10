# REBUILD-5FA — Health Domain Registry

**Program:** ADMIN-DASHBOARD-REBUILD-5F  
**Phase:** 5FA — Health Domain Registry  
**Mode:** Structural extraction (ownership only)

---

## Created: `client/src/lib/admin/domains/health/`

| File | Responsibility |
|------|----------------|
| `healthTypes.ts` | `HealthAssetId`, categories, `LaunchReadinessHealthInputId` boundary types |
| `healthDomain.ts` | `HEALTH_DOMAIN_ID`, 23 asset definitions, `LAUNCH_READINESS_HEALTH_INPUTS` |
| `healthRegistry.ts` | `getHealthAsset`, `getHealthDiagnosticsAssets`, readiness input helpers |
| `index.ts` | Barrel exports |

---

## Domain Identity

```ts
HEALTH_DOMAIN_ID = "health"
```

---

## Asset Categories

| Category | Assets |
|----------|--------|
| `page` | Commercial diagnostics route host |
| `diagnostics` | Entitlements/operational diagnostics panels |
| `runtime` | Runtime status, platform health indicators |
| `monitoring` | Gate consolidation, OPS signal monitoring |
| `reliability` | Visibility decision trace |
| `email` | SMTP/Resend config probe |
| `database` | Cascade integrity probe patterns |
| `server` | Ops log, taxonomy, health signals, auth ops metadata |
| `readiness-input` | Signals produced for Launch Readiness consumption |
| `helper` | Client gate registry, entitlements hook |

---

## Launch Readiness Boundary

Health **produces** runtime probe signals. Launch Readiness **consumes** them — domains are not merged:

```ts
LAUNCH_READINESS_HEALTH_INPUTS = [
  "input-email-health-probe",
  "input-ops-signal-stream",
  "input-runtime-health-signals",
  "input-trpc-pressure-signals",
]
```

`deploymentReadiness` and `featureVisibility` remain **Launch Readiness** owned (REBUILD-5B).

---

## Composition Sections

```ts
HEALTH_COMPOSITION_SECTIONS = [
  "HealthDiagnosticsSection",
  "HealthRuntimeSection",
  "HealthMonitoringSection",
  "HealthReliabilitySection",
  "HealthSignalsSection",
  "HealthReadinessInputsSection",
]
```

No route or navigation changes in this phase.
