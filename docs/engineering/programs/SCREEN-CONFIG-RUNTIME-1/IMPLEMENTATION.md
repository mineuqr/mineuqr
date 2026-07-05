# SCREEN-CONFIG-RUNTIME-1 — Runtime Configuration Activation Architecture
## Phase C — Certification Report

**Program:** SCREEN-CONFIG-RUNTIME-1  
**Type:** Architecture Implementation  
**Date:** 2026-07-06  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

SCREEN-CONFIG-RUNTIME-1 activates the **Runtime Configuration Pipeline** for the Operational Screen Client. Configuration saved by Screen Management now flows through a single `RuntimeConfigurationManager`, is normalized into a `RuntimeConfiguration` contract, published on the Runtime Context, and delivered to roles via `handleConfiguration()`. Kitchen and Expo use **language** and **direction** operationally; **density** and **categories** are loaded, validated, and tracked but not activated. Blocked roles receive and report configuration health without activating unsupported capabilities. No API, database, authentication, bootstrap, or Screen Management changes were made.

---

## 2. Root Cause Analysis

After ROLE-RUNTIME-1, roles advertised configuration capabilities but the runtime still:

- Read raw `screenConfig` directly in `bootstrapLogic.ts`
- Exposed unnormalized API payloads on the Runtime Context
- Applied density to `presentation` prematurely (before capability activation programs)
- Had no configuration lifecycle, version tracking, or health model
- Left `handleConfiguration()` as a no-op on all roles

Configuration was persisted in the database but **ignored architecturally** — presentation pulled fields ad hoc from raw server data.

---

## 3. Architecture Decision

**Decision:** Introduce `RuntimeConfigurationManager` as the sole configuration authority, producing normalized `RuntimeConfiguration` consumed by Runtime Context and roles.

**Rationale:**
- Single pipeline eliminates duplicated loading
- Capability negotiation respects ROLE-RUNTIME-1 declarations
- Invalid configuration falls back safely without crashing runtime
- Version mismatch is observable for live reload via existing polling
- Presentation reads only active fields (language/direction)

**Rejected alternatives:**
- Role-specific config API calls — violates single pipeline rule
- Activating density/categories now — belongs to future programs
- Push-based config — out of scope; polling reused

---

## 4. Runtime Configuration Architecture

```
Screen Management (unchanged)
        │
        ▼
runtime.getStatus (existing API)
        │
        ▼
RuntimeConfigurationManager
  Load → Validate → Normalize → Cache → Publish
        │
        ▼
OperationalScreenRuntimeContext
  runtimeConfiguration
  configurationState
  configurationVersion
  lastAppliedVersion
        │
        ▼
RuntimeRoleHost.handleConfiguration()
        │
        ▼
Presentation (language/direction from context.presentation)
```

---

## 5. Configuration Lifecycle

| State | Meaning |
|-------|---------|
| `loading` | Initial pipeline entry |
| `validating` | Raw payload validation |
| `valid` | Passed validation |
| `invalid` | Validation failed (fallback applied) |
| `pending` | Reserved for future async paths |
| `applied` | Published to runtime context |
| `reloading` | Version change detected |
| `disposed` | Runtime teardown |

Independent from bootstrap lifecycle (`loading` → `running` → `blocked`).

---

## 6. Runtime Configuration Manager

**Location:** `client/src/lib/operational-screen/configuration/runtimeConfigurationManager.ts`

| Method | Responsibility |
|--------|----------------|
| `loadFromStatus()` | Initial load from getStatus |
| `reloadFromStatus()` | Hot-reload on version change |
| `detectVersionChange()` | Compare incoming vs last applied |
| `publish()` | Cache normalized config |
| `buildHealth()` | Configuration health snapshot |
| `dispose()` | Teardown |

Single instance held in `useRuntimeOrchestrator` via `configManagerRef`.

---

## 7. Runtime Configuration Contract

**Location:** `client/src/lib/operational-screen/configuration/runtimeConfigurationContract.ts`

```typescript
RuntimeConfiguration {
  version: string
  role: OperationalDeviceRole
  updatedAt: string
  configurationState: ConfigurationLifecycleState
  validationErrors: string[]
  usedFallback: boolean
  active: { language, direction }      // operational now
  tracked: {
    density, densityActivated: false
    categoryIds, categoriesActivated: false
  }
}
```

Runtime never exposes raw API payloads outside the manager.

---

## 8. Configuration State Model

Exposed on Runtime Context as `configurationState` and within `runtimeConfiguration.configurationState`. Presentation and UI never expose raw loading flags — consumers read formal states only.

---

## 9. Version Tracking

| Field | Source |
|-------|--------|
| `configurationVersion` | Current server version |
| `lastAppliedVersion` | Last successfully applied version |
| `versionMismatch` | Health flag when versions differ during reload |

Version changes detected via existing `getStatus` polling (`STATUS_POLL_INTERVAL_MS`). No page reload required.

---

## 10. Runtime Context

Extended `OperationalScreenRuntimeContext`:

- `runtimeConfiguration: RuntimeConfiguration`
- `configurationState: ConfigurationLifecycleState`
- `configurationVersion: string`
- `lastAppliedVersion: string | null`
- `presentation: { language, direction }` — density removed

Orchestrator exposes `reload()` / `reloadConfiguration()` for manual refresh.

---

## 11. Role Integration

`handleConfiguration(ctx, configuration: RuntimeConfiguration)` is now active:

| Role | Behavior |
|------|----------|
| Kitchen / Expo | Receives config; applies language/direction via context; tracks density/categories |
| Blocked roles | Receive, validate, store; report configuration health in diagnostics |

Lifecycle handlers in `roleConfigurationLifecycle.ts`.

---

## 12. Health Architecture

`RoleRuntimeHealth` extended with:

- `configurationState`
- `appliedVersion`
- `configurationErrors`
- `configurationUsedFallback`

`ConfigurationHealth` from manager includes `lastReloadAt`, `versionMismatch`.

---

## 13. Diagnostics

`ScreenDiagnosticsPanel` and `collectRoleDiagnostics()` include:

- `configurationHealth`
- `runtimeConfiguration` (active + tracked)
- `configurationState`, `configurationVersion`, `lastAppliedVersion`
- Role-specific configuration apply counts

---

## 14. Files Added

| File |
|------|
| `client/src/lib/operational-screen/configuration/runtimeConfigurationContract.ts` |
| `client/src/lib/operational-screen/configuration/runtimeConfigurationManager.ts` |
| `client/src/lib/operational-screen/roles/roleConfigurationLifecycle.ts` |
| `client/src/lib/operational-screen/__tests__/runtimeConfigurationManager.test.ts` |
| `docs/engineering/programs/SCREEN-CONFIG-RUNTIME-1/IMPLEMENTATION.md` |

---

## 15. Files Modified

| File | Change |
|------|--------|
| `runtimeTypes.ts` | RuntimeConfiguration on context; presentation without density |
| `bootstrapLogic.ts` | Manager-driven context assembly and reload |
| `useRuntimeOrchestrator.ts` | Manager integration, health, reload |
| `runtimeRoleContract.ts` | Config-aware health; RuntimeConfiguration in handleConfiguration |
| `runtimeRoleHealth.ts` | Configuration health in role health/diagnostics |
| `roleDefinitions.ts` | Active configuration lifecycles |
| `RuntimeRoleHost.tsx` | Delivers RuntimeConfiguration to roles |
| `ScreenDiagnosticsPanel.tsx` | Configuration diagnostics |
| `architectureGuards.test.ts` | SCREEN-CONFIG-RUNTIME-1 guard |

---

## 16. Validation

- TypeScript `tsc --noEmit` — **PASS**
- Operational screen tests — **40/40 PASS**
- Architecture guards — **12/12 PASS**
- Configuration manager unit tests — **6/6 PASS**
- No presentation component imports configuration APIs
- Kitchen/Expo language/direction from context.presentation only

---

## 17. Test Results

```
client/src/lib/operational-screen/__tests__/
  pairingPayload.test.ts              3 passed
  credentialStore.test.ts             2 passed
  bootstrapStateMachine.test.ts       8 passed
  runtimeContract.test.ts             3 passed
  runtimeConfigurationManager.test.ts 6 passed
  runtimeRoleRegistry.test.ts         6 passed
  architectureGuards.test.ts         12 passed
Total: 40 passed
```

---

## 18. Production Risks

| Risk | Mitigation |
|------|------------|
| Invalid server payloads | Fallback to defaults + health warning |
| Version polling delay | Existing 60s poll; manual `reload()` available |
| Deprecated `configuration` field on context | Retained for migration; normalized contract is authority |
| Density removed from presentation | Intentional — activation deferred |

---

## 19. Future Programs

| Program | Activation |
|---------|------------|
| KITCHEN-DISPLAY-DENSITY-1 | Set `tracked.densityActivated: true`; apply to presentation |
| KITCHEN-CATEGORY-FILTER-1 | Set `tracked.categoriesActivated: true`; filter kitchen queue |

---

## 20. Architecture Compliance Review

| Rule | Status |
|------|--------|
| Single configuration manager | ✓ |
| Configuration contract | ✓ |
| Runtime context exposes configuration | ✓ |
| Roles consume normalized configuration | ✓ |
| Version tracking | ✓ |
| Configuration health | ✓ |
| Kitchen/Expo language+direction operational | ✓ |
| Density inactive | ✓ |
| Category filter inactive | ✓ |
| Blocked roles supported | ✓ |
| No duplicated config loading | ✓ |
| No API/DB/auth changes | ✓ |

---

## 21. Evidence

**Single manager in orchestrator:**
```typescript
const configManagerRef = useRef(new RuntimeConfigurationManager());
const runtimeConfiguration = loadInitialConfiguration(status, configManagerRef.current);
```

**Capability negotiation — density tracked but not activated:**
```typescript
tracked: {
  density: capabilities.supportsDensity ? parsed.displayDensity : DEFAULT,
  densityActivated: false,
  categoriesActivated: false,
}
```

**Presentation — language/direction only:**
```typescript
presentation: {
  language: runtimeConfiguration.active.language,
  direction: runtimeConfiguration.active.direction,
}
```

**Architecture guard:**
```typescript
expect(kitchen).not.toContain("screenConfig");
expect(kitchen).not.toContain("getStatus");
```

---

## 22. Final Certification Decision

**CERTIFIED**

SCREEN-CONFIG-RUNTIME-1 Phase C satisfies all success criteria. Configuration is now a first-class runtime concern with a formal pipeline, contract, lifecycle, version tracking, and role integration — while deferring density and category activation to downstream programs.
