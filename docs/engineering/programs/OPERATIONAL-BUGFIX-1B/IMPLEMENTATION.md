# OPERATIONAL-BUGFIX-1B — BUGFIX-F004 Configuration Version Integrity

**Classification:** Product Readiness  
**Priority:** Critical  
**Status:** COMPLETE — awaiting certification

## Root Cause

`getStatus()` exposed `configVersion: device.updatedAt`. Every heartbeat called `touchDeviceHeartbeat()`, which set **`updatedAt = lastSeenAt`**. The runtime `RuntimeConfigurationManager.detectVersionChange()` compared incoming `configVersion` to `lastAppliedVersion` on each status poll (~60s), triggering:

- `applyConfigurationReload()`
- Category filter re-sync
- Display density re-sync
- `handleConfiguration` lifecycle

This occurred **even when `screenConfig` was unchanged**.

Additionally, `OperationalDeviceRegistryService.updateScreenSettings()` always passed `screenConfig` to the store (including unchanged config on display-name-only updates), which would have incremented revision incorrectly after the revision fix.

## Architecture Compliance

| Constraint | Compliance |
|------------|------------|
| No architecture changes | ✓ Dedicated revision field; existing reload pipeline unchanged |
| No runtime redesign | ✓ `useRuntimeOrchestrator` / `RuntimeConfigurationManager` unchanged |
| No capability negotiation changes | ✓ Untouched |
| No UX modifications | ✓ Untouched |
| No unrelated refactoring | ✓ Scoped to version source + heartbeat persistence |

## Implementation Summary

### 1. Dedicated configuration version (`screenConfigRevision`)

- Migration `drizzle/0057_operational_device_screen_config_revision.sql`
- Schema column `operational_devices.screenConfigRevision` (NOT NULL, default `1`)
- `OperationalDeviceRecord.screenConfigRevision: number`

### 2. Version resolution (`screenConfigVersion.ts`)

```typescript
resolveScreenConfigVersion(device) → String(screenConfigRevision) when > 0, else updatedAt (legacy)
```

Used by:
- `operationalDeviceRuntimeRouter.getStatus` → `configVersion`
- `projectFleetReadModel` → `configurationVersion`

### 3. Heartbeat decoupled from `updatedAt`

`touchDeviceHeartbeat()` now updates **only**:
- `lastSeenAt`
- `reportedVersion` (when provided)

It **no longer** sets `updatedAt`.

### 4. Revision increments only on config change

`updateScreenPresentation()` increments `screenConfigRevision` **only** when `screenConfig` is in the patch.

`OperationalDeviceRegistryService.updateScreenSettings()` passes `screenConfig` to the store **only** when `input.screenConfig` is present (fixes display-name-only false bumps).

### 5. Client contract mirror

`client/src/lib/operational-screen/configVersion.ts` updated to prefer `screenConfigRevision` (aligned with server).

### Files changed

| File | Change |
|------|--------|
| `drizzle/0057_operational_device_screen_config_revision.sql` | **New** migration |
| `drizzle/schema.ts` | `screenConfigRevision` column |
| `server/operational-device/domain/screenConfigVersion.ts` | **New** resolver |
| `server/operational-device/domain/deviceContracts.ts` | `screenConfigRevision` field |
| `server/operational-device/infrastructure/DrizzleOperationalDeviceStore.ts` | Heartbeat + revision bump |
| `server/operational-device/infrastructure/InMemoryOperationalDeviceStore.ts` | Same |
| `server/operational-device/services/OperationalDeviceRegistryService.ts` | Config-only patch |
| `server/operational-device/routers/operationalDeviceRuntimeRouter.ts` | `resolveScreenConfigVersion` |
| `server/operational-device/fleet/services/projectFleetReadModel.ts` | Fleet config version |
| `server/operational-device/fleet/infrastructure/DrizzleFleetReadStore.ts` | Map revision |
| `client/src/lib/operational-screen/configVersion.ts` | Revision-first resolver |
| Tests + architecture guards | See below |

## Validation Results

| Requirement | Result |
|-------------|--------|
| Heartbeat no longer triggers configuration reload | ✓ `configVersion` stable across heartbeats |
| Category filter sync only after config change | ✓ Driven by `configuration.version` / `configVersion` |
| Display density sync only after config change | ✓ Same |
| Runtime lifecycle only on real config change | ✓ `detectVersionChange` + `reloadFromStatus` |
| Provisioning unaffected | ✓ No provisioning code changed |
| Fleet management unaffected | ✓ `configurationVersion` now revision-based |
| Runtime bootstrap unchanged | ✓ Same `loadFromStatus` entry |
| Architecture unchanged | ✓ |

## Regression Tests

```
server/operational-device/__tests__/screenConfigVersion.test.ts          3 tests
server/operational-device/__tests__/configurationVersionIntegrity.test.ts 4 tests
  - heartbeat updates lastSeenAt, not config version
  - 5 heartbeat cycles, version stable
  - screen config update → revision 2
  - display name only → revision unchanged

client/.../runtimeConfigurationManager.test.ts                         8 tests
  - repeated polls same configVersion → reloadFromStatus null
  - revision change → reload applies new config

Architecture guards:
  - deviceManagementArchitecture.test.ts (BUGFIX-F004)
  - architectureGuards.test.ts (BUGFIX-F004)

tsc --noEmit: PASS
```

## Runtime Behavior Before vs After

| Event | Before | After |
|-------|--------|-------|
| Heartbeat | `updatedAt` changes → `configVersion` changes → reload | `lastSeenAt` only → `configVersion` unchanged → no reload |
| Status poll (no config edit) | Reload every ~60s | No reload |
| Screen settings save (config) | Reload (correct) | Revision +1 → reload (correct) |
| Display name save | Reload (incorrect) | No revision bump → no reload; name updated via status identity merge |
| Fleet `configurationVersion` | Followed heartbeat `updatedAt` | Follows `screenConfigRevision` |

## Production Acceptance

| Criterion | Status |
|-----------|--------|
| Migration `0057` for `screenConfigRevision` | ✓ Ready to deploy |
| Heartbeat does not mutate config version source | ✓ |
| `getStatus().configVersion` revision-based | ✓ |
| Regression + architecture guards pass | ✓ |
| One-time reload after deploy | Expected: clients with cached `updatedAt` version will reload once when server returns `"1"` |

**Deploy note:** Run migration `0057` before or with application deploy. Existing devices receive `screenConfigRevision = 1`. First status poll after deploy may trigger a single legitimate reload as version format changes from ISO timestamp to revision `"1"`.

**Certification:** Awaiting program owner acceptance before OPERATIONAL-BUGFIX-1C.
