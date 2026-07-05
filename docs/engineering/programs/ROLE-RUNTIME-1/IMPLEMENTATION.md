# ROLE-RUNTIME-1 — Runtime Role Activation Architecture
## Phase C — Certification Report

**Program:** ROLE-RUNTIME-1  
**Type:** Architecture Implementation  
**Date:** 2026-07-05  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

ROLE-RUNTIME-1 introduces a **role-driven runtime architecture** for the Operational Screen Client. All six screen types now execute through a single runtime platform with one resolver, one lifecycle, and one registry. Kitchen and Expo roles are **operational**; Pickup, Customer Display, Print Monitor, and Self Ordering are **blocked by design** (lifecycle executes, capability intentionally unavailable). No authentication, bootstrap, API, database, or pairing changes were made.

---

## 2. Root Cause Analysis

Prior to this program, runtime behavior was **page-driven**: `RoleRouter.tsx` contained imperative `if/else` routing keyed on server capability flags (`canAccessKitchenQueue`, `canAccessPrintMonitor`). Every screen type shared identical bootstrap, heartbeat, and polling infrastructure but lacked:

- A formal role contract and lifecycle surface
- A central role registry (routing logic scattered in the router)
- Declarative role metadata and capabilities
- Role-aware health and diagnostics
- A blocked-runtime model distinct from errors

This prevented downstream programs (SCREEN-CONFIG-RUNTIME-1, KITCHEN-CATEGORY-FILTER-1, KITCHEN-DISPLAY-DENSITY-1) from attaching configuration and capability activation per role.

---

## 3. Architecture Decision

**Decision:** Introduce a `RuntimeRoleDefinition` contract registered in a single `RuntimeRoleRegistry`, resolved exclusively by `RuntimeRoleHost`.

**Rationale:**
- Preserves exactly one runtime (auth, bootstrap, websocket/polling, lifecycle unchanged)
- Eliminates switch/if-else routing in favor of registry lookup
- Blocked roles remain first-class citizens with full lifecycle execution
- Capabilities and metadata live on role definitions, not UI

**Rejected alternatives:**
- Separate applications per role — violates single-runtime rule
- Role-specific bootstrap — duplicates lifecycle
- Keeping Print Monitor operational — spec mandates blocked until future program

---

## 4. Runtime Architecture

```
Operational Screen Runtime (/screen)
        │
        ▼
ScreenRuntimeProvider (tRPC transport)
        │
        ▼
OperationalScreenRuntimeProvider (canonical authority)
        │
        ▼
useRuntimeOrchestrator (bootstrap state machine + heartbeat)
        │
        ▼
RuntimeRoleHost (single resolver)
        │
        ▼
RuntimeRoleRegistry.resolve(role)
        │
        ├── kitchen_display  → KitchenRolePresentation (operational)
        ├── expo_display     → KitchenRolePresentation (operational)
        ├── pickup_display   → BlockedRolePresentation (blocked)
        ├── customer_display → BlockedRolePresentation (blocked)
        ├── print_monitor    → BlockedRolePresentation (blocked)
        └── self_ordering_kiosk → BlockedRolePresentation (blocked)
```

---

## 5. Runtime Lifecycle

Every role implements the identical lifecycle contract:

| Method | Purpose |
|--------|---------|
| `initialize()` | First context assembly |
| `mount()` | Presentation mount |
| `activate()` | Phase → running (operational roles) |
| `deactivate()` | Leave running phase |
| `dispose()` | Teardown |
| `handleConfiguration()` | Config version hot-reload (values ignored) |
| `handleHeartbeat()` | Platform heartbeat tick |
| `handleReconnect()` | Recovery from degraded |

Platform bootstrap phases (`loading` → `validating` → `context_ready` → `heartbeat_active` → `running` | `blocked`) remain unchanged. Role lifecycle hooks are invoked by `RuntimeRoleHost` via `useEffect` — no duplicate platform lifecycle.

---

## 6. Role Registry

**Location:** `client/src/lib/operational-screen/roles/runtimeRoleRegistry.ts`

| API | Responsibility |
|-----|----------------|
| `registerRuntimeRole(definition)` | Register role definition |
| `resolveRuntimeRole(role)` | Lookup by role (throws if unregistered) |
| `supportedRuntimeRoles()` | All registered roles |
| `isRoleOperational(role)` | Operational flag from metadata |

Registration is idempotent via `registerRoles.ts` (module load). Tests use `clearRuntimeRoleRegistryForTests()`.

---

## 7. Runtime Contract

**Location:** `client/src/lib/operational-screen/roles/runtimeRoleContract.ts`

```typescript
RuntimeRoleDefinition {
  metadata: RoleMetadata
  lifecycle: RoleLifecycleHandlers
  resolveRuntimeStatus(phase, context, reconnecting): RoleRuntimeStatus
  collectDiagnostics(ctx): RoleDiagnosticsContribution
  presentationKey: "kitchen" | "blocked"
}
```

Presentation components are resolved separately (`runtimeRolePresentations.ts`) to avoid circular imports between lib and components.

---

## 8. Runtime State Model

**Location:** `client/src/lib/operational-screen/roles/runtimeRoleState.ts`

| State | Trigger |
|-------|---------|
| `initializing` | Bootstrap `loading` |
| `authenticating` | Bootstrap `validating` |
| `bootstrapping` | `context_ready`, `heartbeat_active` |
| `ready` | `running` + non-operational role |
| `operational` | `running` + operational role |
| `blocked` | Bootstrap `blocked` |
| `disconnected` | Bootstrap `degraded` |
| `reconnecting` | Recovery from degraded |
| `disposed` | `revoked`, `pairing_redirect` |

---

## 9. Blocked Runtime Model

Blocked roles are **not errors**. They:

1. Register in the role registry
2. Execute full lifecycle (initialize → mount → heartbeat)
3. Report `RoleRuntimeStatus.blocked`
4. Render `BlockedRolePresentation` with:
   - "Role available — runtime initialized"
   - Role-specific `blockedReason`
   - Future program reference

Print Monitor transitions from previously operational (Phase B) to blocked per ROLE-RUNTIME-1 scope. `PrintMonitorScreenPanel.tsx` remains in codebase for future activation.

---

## 10. Capability Model

Capabilities declared per role in `roleDefinitions.ts`:

| Role | Key Capabilities |
|------|------------------|
| Kitchen / Expo | orders, tickets, density*, categoryFilter* |
| Pickup | orders, queue, readyOrders |
| Customer Display | orders, timeline, animation |
| Print Monitor | orders, printMonitor |
| Self Ordering | orders |

\*Advertised only — activation deferred to SCREEN-CONFIG-RUNTIME-1.

UI reads capabilities via `getRoleCapabilities(role)` — not hardcoded.

---

## 11. Runtime Metadata

Each role exposes:

- `role`, `displayName`, `description`
- `operational` flag
- `capabilities`
- `configurationSchemaVersion` ("1")
- `futurePrograms`
- `blockedReason` (blocked roles)

---

## 12. Health Architecture

**Location:** `client/src/lib/operational-screen/roles/runtimeRoleHealth.ts`

`RoleRuntimeHealth` reports:
- `runtimeState`, `role`, `version`
- `configurationVersion`
- `capabilities`, `operational`
- `blockedReason`
- `heartbeatCount`, `reconnectCount`

Exposed via `useScreenRuntime().roleHealth` and `RoleRuntimeStatusBanner`.

---

## 13. Diagnostics Architecture

Role-aware diagnostics merged in orchestrator:

- Platform diagnostics (phase, heartbeat failures, fingerprint)
- `roleHealth` snapshot
- `roleDiagnostics` from `definition.collectDiagnostics(ctx)`

`ScreenDiagnosticsPanel` includes `roleHealth`, `roleDiagnostics`, and registry-sourced `capabilities.role`.

---

## 14. Files Added

| File |
|------|
| `client/src/lib/operational-screen/roles/runtimeRoleContract.ts` |
| `client/src/lib/operational-screen/roles/runtimeRoleRegistry.ts` |
| `client/src/lib/operational-screen/roles/runtimeRoleState.ts` |
| `client/src/lib/operational-screen/roles/runtimeRoleLifecycle.ts` |
| `client/src/lib/operational-screen/roles/runtimeRoleHealth.ts` |
| `client/src/lib/operational-screen/roles/roleDefinitions.ts` |
| `client/src/lib/operational-screen/roles/registerRoles.ts` |
| `client/src/lib/operational-screen/roles/useRoleRuntime.ts` |
| `client/src/lib/operational-screen/__tests__/runtimeRoleRegistry.test.ts` |
| `client/src/components/operational-screen/RuntimeRoleHost.tsx` |
| `client/src/components/operational-screen/RoleRuntimeStatusBanner.tsx` |
| `client/src/components/operational-screen/runtimeRolePresentations.ts` |
| `client/src/components/operational-screen/roles/KitchenRolePresentation.tsx` |
| `client/src/components/operational-screen/roles/BlockedRolePresentation.tsx` |
| `docs/engineering/programs/ROLE-RUNTIME-1/IMPLEMENTATION.md` |

---

## 15. Files Modified

| File | Change |
|------|--------|
| `client/src/lib/operational-screen/runtimeCapabilities.ts` | Registry-sourced blocked/operational; print API disabled |
| `client/src/lib/operational-screen/useRuntimeOrchestrator.ts` | Role health, diagnostics, platform metrics |
| `client/src/pages/screen/OperationalScreenEntry.tsx` | `RuntimeRoleHost` replaces `RoleRouter` |
| `client/src/components/operational-screen/RoleRouter.tsx` | Deprecated re-export of `RuntimeRoleHost` |
| `client/src/components/operational-screen/ScreenDiagnosticsPanel.tsx` | Role-aware diagnostics |
| `client/src/lib/operational-screen/__tests__/architectureGuards.test.ts` | ROLE-RUNTIME-1 guards; print blocked |

---

## 16. Validation Performed

- TypeScript `tsc --noEmit` — **PASS**
- Operational screen test suite — **33/33 PASS**
- Architecture guard tests — **11/11 PASS**
- Registry unit tests — **6/6 PASS**
- Manual code review: no switch/if-else role routing in `RuntimeRoleHost`
- Backward compatibility: pairing, auth, bootstrap, API unchanged

---

## 17. Test Results

```
client/src/lib/operational-screen/__tests__/
  pairingPayload.test.ts        3 passed
  bootstrapStateMachine.test.ts 8 passed
  credentialStore.test.ts       2 passed
  runtimeContract.test.ts       3 passed
  runtimeRoleRegistry.test.ts   6 passed
  architectureGuards.test.ts   11 passed
Total: 33 passed
```

---

## 18. Production Risks

| Risk | Mitigation |
|------|------------|
| Print Monitor regression (was operational) | Intentional per spec; blocked UI with clear messaging |
| Circular import lib↔components | `presentationKey` + separate presentation map |
| Heartbeat count in refs not reactive | Included in rolePlatform memo deps via phase/status |
| DEV-only diagnostics unchanged | Pre-existing condition from OPERATIONAL-SCREEN-HARDENING-1 |

---

## 19. Future Programs

| Program | Dependency on ROLE-RUNTIME-1 |
|---------|------------------------------|
| SCREEN-CONFIG-RUNTIME-1 | Activates `handleConfiguration`, density/categoryFilter |
| KITCHEN-CATEGORY-FILTER-1 | Kitchen `supportsCategoryFilter` |
| KITCHEN-DISPLAY-DENSITY-1 | Kitchen `supportsDensity` |
| Future Pickup/Customer/Print/Kiosk UI | Replace `presentationKey: "blocked"` with operational presentations |

---

## 20. Architecture Compliance Review

| Rule | Status |
|------|--------|
| Single runtime | ✓ |
| No duplicated bootstrap/auth/heartbeat | ✓ |
| Single resolver (`RuntimeRoleHost`) | ✓ |
| Single registry | ✓ |
| Role contract with uniform lifecycle | ✓ |
| Kitchen + Expo operational | ✓ |
| Pickup, Customer, Print, Self Ordering blocked | ✓ |
| No API/DB/auth changes | ✓ |
| No config activation | ✓ |
| Capabilities not hardcoded in UI | ✓ |
| Blocked ≠ error | ✓ |

---

## 21. Evidence

**Registry resolution (no switch):**
```typescript
// RuntimeRoleHost.tsx
const definition = resolveRuntimeRole(context.identity.role);
const Presentation = resolveRolePresentation(definition);
```

**Blocked role from registry:**
```typescript
// runtimeCapabilities.ts
export function isBlockedRole(role) {
  return !isRoleOperational(role);
}
```

**Print monitor blocked:**
```typescript
// roleDefinitions.ts — printMonitorRole.metadata.operational === false
```

**Architecture test:**
```typescript
expect(isBlockedRole("print_monitor")).toBe(true);
expect(roleHost).not.toMatch(/switch\s*\(/);
```

---

## 22. Final Certification Decision

**CERTIFIED**

ROLE-RUNTIME-1 Phase C implementation satisfies all success criteria. The operational screen runtime is now role-driven with a formal contract, registry, state model, blocked-runtime semantics, and role-aware health/diagnostics — while preserving a single platform runtime and backward-compatible pairing/bootstrap.
