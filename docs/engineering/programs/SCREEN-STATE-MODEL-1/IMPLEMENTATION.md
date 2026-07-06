# SCREEN-STATE-MODEL-1 — Unified Operational Screen State Architecture
## Phase C — Certification Report

**Program:** SCREEN-STATE-MODEL-1  
**Type:** Architecture Implementation  
**Date:** 2026-07-06  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

SCREEN-STATE-MODEL-1 introduces the **canonical Operational Screen State Model** for the entire Operational Screen Platform. Runtime, configuration, density, category filtering, connectivity, business readiness, and maintenance previously exposed independent states. This program consolidates them into a single `OperationalScreenState` contract produced by exactly one `OperationalScreenStateAggregator`. Health and diagnostics are now **projections** of canonical state — they no longer derive operational state independently. Presentation components consume `context.screenState` only. Authentication, bootstrap lifecycle, configuration pipeline, density, category filtering, APIs, and database remain unchanged. Fleet UI is not implemented; the model is fleet-ready.

---

## 2. Root Cause Analysis

After ROLE-RUNTIME-1, SCREEN-CONFIG-RUNTIME-1, KITCHEN-CATEGORY-FILTER-1, and KITCHEN-DISPLAY-DENSITY-1, each subsystem owned its own lifecycle and health signals:

| Subsystem | Independent State |
|-----------|-------------------|
| Bootstrap state machine | `BootstrapPhase` |
| Role runtime | `RoleRuntimeStatus` |
| Configuration manager | `ConfigurationLifecycleState` |
| Category filter manager | `CategoryFilterHealth` |
| Display density manager | `DensityLifecycleState` |
| Health builder | `buildRoleRuntimeHealth()` |
| Diagnostics collector | `collectRoleDiagnostics()` |

Presentation and diagnostics inspected multiple sources (`phase`, `degraded`, subsystem health objects) and duplicated precedence logic. There was no single authority for "what is the screen's operational state right now?" — a blocker for Fleet Management, unified diagnostics, and support tooling.

---

## 3. Architecture Decision

**Decision:** Introduce `OperationalScreenState` as the sole external state contract, produced by `OperationalScreenStateAggregator` in the runtime orchestrator. Health and diagnostics become read-only projections.

**Rationale:**
- Exactly one state authority eliminates duplicated calculations
- Precedence rules are centralized and testable
- Business readiness is explicit — never inferred from UI
- Maintenance is distinct from offline/disconnected
- Fleet, workspace, and observability can consume one contract
- Presentation components remain thin consumers

**Rejected alternatives:**
- Per-role state models — violates unified platform goal
- Health-as-source-of-truth — health becomes derivative, not authoritative
- React-context state calculation — violates "no state in components" rule

---

## 4. Canonical State Architecture

```
Subsystem Inputs
  ├── Bootstrap phase / degraded / reconnecting
  ├── Role runtime (status, operational, blockedReason)
  ├── RuntimeConfiguration + ConfigurationHealth
  ├── DisplayDensityHealth + densityState
  ├── CategoryFilterHealth
  └── Device status / token presence
        │
        ▼
OperationalScreenStateAggregator
  ├── Normalize subsystem states
  ├── Resolve precedence
  ├── Aggregate warnings / errors
  └── Publish OperationalScreenState
        │
        ├──────────────────┬──────────────────┐
        ▼                  ▼                  ▼
  Runtime Context    projectHealth      projectDiagnostics
        │                  │                  │
        ▼                  ▼                  ▼
  Presentation       RoleRuntimeHealth   Diagnostics panel
  (banners, roles)   (projection)        (projection)
```

---

## 5. OperationalScreenState Contract

```typescript
OperationalScreenState {
  version: number
  updatedAt: string
  runtimeState: RoleRuntimeStatus
  configurationState: ConfigurationLifecycleState
  densityState: DensityLifecycleState
  displayDensity: CanonicalDisplayDensity | null
  densityVersion: number | null
  categoryFilterState: "inactive" | "active" | "warning"
  connectivityState: ConnectivityState
  operationalState: OperationalState
  businessReadiness: BusinessReadiness
  maintenanceState: MaintenanceState
  blockedReason: { en, ar } | null
  warnings: ScreenStateWarning[]
  errors: ScreenStateError[]
}
```

**Location:** `client/src/lib/operational-screen/state/operationalScreenStateContract.ts`

---

## 6. State Aggregator

`OperationalScreenStateAggregator` (`operationalScreenStateAggregator.ts`):

| Responsibility | Implementation |
|----------------|----------------|
| Collect subsystem states | `StateAggregatorInput` from orchestrator `useMemo` |
| Normalize | Maps health objects → canonical enums |
| Resolve precedence | `resolveOperationalState()` |
| Calculate overall state | `operationalState`, `businessReadiness`, `connectivityState` |
| Publish | Returned state merged into runtime context |
| Cache | `getState()` + internal `state` field |
| Detect changes | Monotonic `version` counter per aggregation |
| Dispose | `dispose()` on orchestrator teardown |

**Instantiation:** Single `stateAggregatorRef` in `useRuntimeOrchestrator.ts`.

---

## 7. State Precedence

Canonical precedence (highest wins):

```
Disposed
  ↓
Disconnected
  ↓
Maintenance
  ↓
Blocked
  ↓
Degraded
  ↓
Operational / Initializing / Ready
```

**Examples validated by tests:**
- Configuration invalid + runtime running → **Degraded**
- Device disabled + blocked phase → **Maintenance** (maintenance beats blocked)
- Revoked bootstrap → **Disposed** + connectivity **Offline**
- Blocked role at `bootstrapPhase: "blocked"` → **Blocked** + businessReadiness **role_unavailable**

---

## 8. Business Readiness Model

Separate from runtime operational state. Never inferred from UI.

| Value | Trigger |
|-------|---------|
| `ready` | Running + role operational + valid config |
| `configuration_required` | Invalid config, fallback, or version mismatch |
| `pairing_required` | No token, revoked, pairing redirect |
| `role_unavailable` | Blocked phase or running but role not operational |
| `maintenance` | Device status disabled |
| `unknown` | Transitional bootstrap phases |

---

## 9. Maintenance Model

| Value | Meaning |
|-------|---------|
| `normal` | Device active |
| `maintenance` | Device disabled (server-side) |
| `read_only` | Reserved for future programs |

Maintenance maps to `operationalState: "maintenance"` and takes precedence over blocked/degraded. Maintenance is **not** offline — connectivity may still be `connected`.

---

## 10. Health Architecture

**Before:** `buildRoleRuntimeHealth()` computed operational flags from bootstrap phase, config health, and role state independently.

**After:** `projectHealthFromScreenState()` reads `OperationalScreenState` and maps to `RoleRuntimeHealth`. The `operational` boolean is `state.operationalState === "operational"`. Extended projection fields (`screenStateVersion`, `operationalState`, `connectivityState`, `businessReadiness`, `maintenanceState`, `warningCount`, `errorCount`) support diagnostics without recalculation.

Health is a **projection**, not a source of truth.

---

## 11. Diagnostics Architecture

**Before:** `collectRoleDiagnostics()` assembled diagnostics from multiple subsystem health objects.

**After:** `projectDiagnosticsFromScreenState()` embeds canonical `screenState` plus identity and configuration metadata. `ScreenDiagnosticsPanel` reads `context.screenState` and projected `roleHealth` / `roleDiagnostics` — no independent state calculations.

Legacy `buildRoleRuntimeHealth` / `collectRoleDiagnostics` remain in `runtimeRoleHealth.ts` for reference but are no longer called by the orchestrator.

---

## 12. Runtime Context

`OperationalScreenRuntimeContext` extended with canonical fields:

```typescript
screenState: OperationalScreenState
operationalState: OperationalState
connectivityState: ConnectivityState
businessReadiness: BusinessReadiness
maintenanceState: MaintenanceState
warnings: ScreenStateWarning[]
errors: ScreenStateError[]
```

Orchestrator exposes `contextWithScreenState` via `useMemo` aggregation. Bootstrap `phase` remains internal to the state machine; presentation does not consume it directly.

---

## 13. Files Added

| File | Purpose |
|------|---------|
| `client/src/lib/operational-screen/state/operationalScreenStateContract.ts` | Canonical state types |
| `client/src/lib/operational-screen/state/operationalScreenStateAggregator.ts` | Single state authority |
| `client/src/lib/operational-screen/state/initialScreenState.ts` | Bootstrap/dispose initial states |
| `client/src/lib/operational-screen/state/projectScreenHealth.ts` | Health projection |
| `client/src/lib/operational-screen/state/projectScreenDiagnostics.ts` | Diagnostics projection |
| `client/src/lib/operational-screen/__tests__/operationalScreenStateAggregator.test.ts` | Aggregator unit tests |
| `docs/engineering/programs/SCREEN-STATE-MODEL-1/IMPLEMENTATION.md` | This certification report |

---

## 14. Files Modified

| File | Change |
|------|--------|
| `client/src/lib/operational-screen/runtimeTypes.ts` | Context extended with canonical state fields |
| `client/src/lib/operational-screen/bootstrapLogic.ts` | Initial `createInitialScreenState()` on context build |
| `client/src/lib/operational-screen/useRuntimeOrchestrator.ts` | Aggregator integration, health/diagnostics projections |
| `client/src/lib/operational-screen/roles/runtimeRoleContract.ts` | `RoleRuntimeHealth` projection fields |
| `client/src/components/operational-screen/ScreenConnectionBanner.tsx` | Consumes `screenState` |
| `client/src/components/operational-screen/OperationalScreenShell.tsx` | Passes `context.screenState` to banner |
| `client/src/components/operational-screen/RoleRuntimeStatusBanner.tsx` | Consumes `context.screenState` |
| `client/src/components/operational-screen/roles/BlockedRolePresentation.tsx` | Consumes `context.screenState` |
| `client/src/components/operational-screen/ScreenDiagnosticsPanel.tsx` | Consumes canonical state + projections |
| `client/src/lib/operational-screen/roles/useRoleRuntime.ts` | Simplified; no health builder re-exports |
| `client/src/pages/screen/OperationalScreenEntry.tsx` | Retry UI uses canonical connectivity/operational state |
| `client/src/lib/operational-screen/__tests__/architectureGuards.test.ts` | SCREEN-STATE-MODEL-1 guard + HARDENING-04 update |

---

## 15. Validation

| Criterion | Status |
|-----------|--------|
| OperationalScreenState contract | ✓ |
| OperationalScreenStateAggregator | ✓ |
| Canonical state precedence | ✓ |
| Business readiness | ✓ |
| Maintenance state | ✓ |
| Connectivity state | ✓ |
| Health consumes state | ✓ |
| Diagnostics consume state | ✓ |
| Runtime context updated | ✓ |
| Presentation consumes canonical state | ✓ |
| No duplicated calculations in presentation/diagnostics | ✓ |
| Kitchen role support | ✓ |
| Expo role support | ✓ |
| Blocked roles support | ✓ |
| Backward compatibility (auth, bootstrap, config, API, DB) | ✓ |
| Fleet UI not implemented (as specified) | ✓ |

---

## 16. Test Results

```
npx vitest run client/src/lib/operational-screen

 Test Files  11 passed (11)
      Tests  66 passed (66)
```

**New tests (7):** `operationalScreenStateAggregator.test.ts`
- Canonical aggregation
- Blocked role state
- Configuration invalid → degraded precedence
- Disposed over operational
- Maintenance before blocked
- Density fallback warning collection
- Kitchen/Expo identical state model

**Architecture guard:** `SCREEN-STATE-MODEL-1: canonical state via aggregator only`

```
npx tsc --noEmit
Exit code: 0
```

---

## 17. Performance Validation

- Aggregation runs inside orchestrator `useMemo` — recomputes only when subsystem inputs change
- No additional network requests
- No additional React re-renders beyond existing orchestrator dependency graph
- Version counter is O(1); warning/error collection is O(n) over small fixed arrays
- Single aggregator instance per runtime session (`useRef`)

---

## 18. Production Risks

| Risk | Mitigation |
|------|------------|
| Legacy `phase`/`degraded` still exposed on `useScreenRuntime` for bootstrap internals | Presentation migrated to `screenState`; bootstrap fields retained for state machine only |
| `runtimeRoleHealth.ts` orphaned builders | Not imported by orchestrator; safe to remove in future cleanup program |
| `read_only` maintenance not yet activated | Enum reserved; no false positives |
| Medium-severity warnings force degraded state | Intentional per precedence spec; monitor warning volume in production |

---

## 19. Future Programs

| Program | Consumes |
|---------|----------|
| Fleet Overview | `OperationalScreenState.operationalState`, `connectivityState` |
| Fleet Filters | `businessReadiness`, `maintenanceState` |
| Provisioning | `businessReadiness: pairing_required` |
| Support tooling | `warnings`, `errors`, `blockedReason` |
| Observability | `screenState.version`, `updatedAt` |
| Maintenance read-only mode | `maintenanceState: read_only` |

---

## 20. Architecture Compliance Review

| Rule | Compliance |
|------|------------|
| No duplicate state calculations | ✓ Centralized in aggregator |
| No state calculation in React components | ✓ Components read `context.screenState` |
| No state calculation in diagnostics | ✓ Projection only |
| No state calculation in health | ✓ Projection only |
| No role-specific state models | ✓ Kitchen/Expo/Blocked share contract |
| No raw subsystem states to presentation | ✓ Canonical contract only |
| Single aggregator | ✓ `stateAggregatorRef` |
| Health is projection | ✓ `projectHealthFromScreenState` |
| Diagnostics is projection | ✓ `projectDiagnosticsFromScreenState` |
| API/DB/auth unchanged | ✓ Client-only change |

---

## 21. Evidence

### Aggregator in orchestrator

```typescript
const stateAggregatorRef = useRef(new OperationalScreenStateAggregator());
// ...
const screenState = useMemo(() => stateAggregatorRef.current.aggregate(input), [...]);
const contextWithScreenState = useMemo(() => ({
  ...exposedContext,
  screenState,
  operationalState: screenState.operationalState,
  // ...
}), [exposedContext, screenState]);
```

### Architecture guard assertions

- `OperationalScreenStateAggregator` exists
- Orchestrator uses `stateAggregatorRef`, `projectHealthFromScreenState`, `projectDiagnosticsFromScreenState`
- `RoleRuntimeStatusBanner` uses `screenState`, not `useRoleRuntimeHealth`
- `OperationalScreenShell` does not reference `phase` or `degraded`

### Precedence test evidence

```
precedence: maintenance before blocked — operationalState === "maintenance"
configuration invalid + running — operationalState === "degraded"
```

---

## 22. Final Certification Decision

**CERTIFIED**

SCREEN-STATE-MODEL-1 Phase C implementation is complete. The platform now has one authoritative Operational Screen State Model. All operational screens report the same canonical state through `OperationalScreenStateAggregator`. Health and diagnostics consume projections. Presentation consumes `OperationalScreenState` only. All 66 operational-screen tests pass. TypeScript compiles cleanly. The architecture is ready for downstream Fleet, Diagnostics, Provisioning, Support, and Observability programs.
