# OPERATIONAL-BUGFIX-1A — BUGFIX-F003 Provisioning Status Safety

**Classification:** Product Readiness  
**Priority:** Critical  
**Status:** COMPLETE — awaiting certification

## Root Cause

Fleet **Status** invoked `openProvision(deviceId, "resume")`. When `provisioningSessionManager.findSessionByDevice()` returned `null` (no browser `sessionStorage` session), navigation fell through to `mode=rotate` with `deviceId`.

`ProvisioningWorkspacePanel` mounted a `useEffect` that automatically called `rotateToken` whenever `provisionMode=rotate` and `deviceId` were present — revoking active credentials and forcing device re-pairing.

**Failure chain (before fix):**

```
Fleet → Status → findSessionByDevice() → null
  → navigate(mode="rotate")
  → useEffect → rotateToken()
  → credentials revoked → device unauthorized
```

## Architecture Compliance

| Constraint | Compliance |
|------------|------------|
| No architecture changes | ✓ Minimal navigation + presentation additions only |
| No runtime capability negotiation changes | ✓ Untouched |
| No provisioning architecture changes | ✓ `ProvisioningSessionManager`, session contract, fleet read model unchanged |
| No unrelated refactoring | ✓ Scoped to fleet handoff + provisioning workspace |
| Certified patterns preserved | ✓ Status projection via fleet read model; session authority in hook |

## Implementation Summary

### 1. Separated fleet navigation (`provisioningNavigation.ts`)

- **Status** → `mode=status&deviceId=…` (never reads sessionStorage for fallback)
- **Resume** → `mode=resume&sessionId=…` when local session exists; otherwise `mode=resume&deviceId=…` with missing-session message
- **Rotate** → `mode=rotate&deviceId=…` only from explicit **Provision** fleet action

### 2. Fleet workspace (`ScreenManagementWorkspacePanel.tsx`)

- Replaced `openProvision` with `navigateFleetProvisioning(action)`
- `onViewStatus` → `"status"` (was `"resume"` → rotate fallback)

### 3. Removed automatic rotation (`ProvisioningWorkspacePanel.tsx`)

- Deleted `useEffect` that called `rotateMutation.mutate` on mount
- Added `RotateCredentialsConfirmation` — rotation only after operator confirms
- Header **Rotate credentials** button opens confirmation instead of immediate mutate

### 4. Read-only status mode

- New URL mode: `status`
- `useProvisioningWorkspace` polls fleet + device by `deviceId` without session
- `projectFleetDeviceStatus.ts` projects `ProvisioningHealth` from fleet read model
- `DeviceOperationalStatusPanel.tsx` — read-only server-sourced view

### 5. Resume missing session

- `resumeSessionMissing` flag when `mode=resume` without restorable session
- Message + link to status view; never falls back to rotate

### Files changed

| File | Change |
|------|--------|
| `client/src/lib/screen-provisioning/provisioningNavigation.ts` | **New** — fleet navigation resolver |
| `client/src/lib/screen-provisioning/projectFleetDeviceStatus.ts` | **New** — fleet → health projection |
| `client/src/lib/screen-provisioning/provisioningUrl.ts` | Added `status` mode |
| `client/src/lib/screen-provisioning/useProvisioningWorkspace.ts` | Status polling + resume missing detection |
| `client/src/components/screen-management/ScreenManagementWorkspacePanel.tsx` | Safe fleet navigation |
| `client/src/components/screen-provisioning/ProvisioningWorkspacePanel.tsx` | No auto-rotate; confirm + status UI |
| `client/src/components/screen-provisioning/DeviceOperationalStatusPanel.tsx` | **New** — read-only status panel |
| `client/src/lib/screen-provisioning/__tests__/provisioningNavigation.test.ts` | **New** — regression tests |
| `client/src/lib/screen-provisioning/__tests__/projectFleetDeviceStatus.test.ts` | **New** — projection tests |
| `client/src/lib/screen-provisioning/__tests__/architectureGuards.test.ts` | BUGFIX-F003 guards |

## Validation Results

| Requirement | Result |
|-------------|--------|
| Status never rotates credentials | ✓ `mode=status` has no rotate mutation path |
| Resume never rotates credentials | ✓ Missing session shows message only |
| Rotate only after explicit confirmation | ✓ `RotateCredentialsConfirmation` required |
| Existing provisioning workflow intact | ✓ Create → session → credentials unchanged |
| Existing pairing workflow intact | ✓ Device runtime auth untouched |
| Fleet management unaffected | ✓ Only navigation targets changed |
| Screen provisioning architecture unchanged | ✓ Session manager + projector preserved |

## Regression Test Results

```
client/src/lib/screen-provisioning — 4 files, 23 tests — ALL PASSED

provisioningNavigation.test.ts     8 tests (status/resume/rotate/navigation safety)
projectFleetDeviceStatus.test.ts   2 tests (fleet projection)
architectureGuards.test.ts         9 tests (includes BUGFIX-F003 guards)
provisioningWorkspace.test.ts      4 tests (existing — pass)
```

Architecture guards verify:

- Fleet uses `navigateFleetProvisioning(id, "status")`
- No `openProvision(id, "resume")` rotate fallback
- No `useEffect` + `rotateMutation.mutate` on mount
- `status` URL mode present

## Operational Impact

| Before | After |
|--------|-------|
| Status click could revoke live device credentials | Status is read-only; credentials untouched |
| Operators on different browsers forced re-pair | Status loads from server regardless of sessionStorage |
| Rotate happened without warning | Rotate requires explicit confirmation |
| Resume without session silently rotated | Resume shows clear missing-session guidance |

**Production risk reduction:** Eliminates accidental credential revocation — previously **Critical** (F-003).

## Production Acceptance

| Criterion | Status |
|-----------|--------|
| No automatic `rotateToken` on navigation | ✓ |
| Status workflow server-sourced and read-only | ✓ |
| Rotate requires operator confirmation | ✓ |
| Tests and architecture guards pass | ✓ |
| Typecheck clean | Pending CI / local `tsc` |
| Manual operator verification | Recommended: Status on operational screen from clean browser session |

**Certification:** Awaiting program owner acceptance before OPERATIONAL-BUGFIX-1B.
