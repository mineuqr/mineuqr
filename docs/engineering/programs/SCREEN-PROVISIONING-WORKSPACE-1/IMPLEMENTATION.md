# SCREEN-PROVISIONING-WORKSPACE-1 — Operational Provisioning Workspace Architecture
## Phase C — Certification Report

**Program:** SCREEN-PROVISIONING-WORKSPACE-1  
**Type:** Architecture Implementation  
**Date:** 2026-07-06  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

SCREEN-PROVISIONING-WORKSPACE-1 transforms operational screen provisioning from a **dialog-driven modal workflow** into a **first-class Operational Workspace** aligned with ADR-ARCH-016. Provisioning is now a lifecycle (`ProvisioningSession`) with canonical provisioning, pairing, and activation states. The `ProvisioningWorkspacePanel` owns credentials, QR display, pairing observation, rotation, timeout, and retry — while fleet cards remain lightweight entry points. Sessions survive browser refresh via URL (`section=screen-provisioning&provisionSession=…`) and `sessionStorage`. Authentication, pairing protocol, QR format, APIs, and database remain unchanged.

---

## 2. Root Cause Analysis

After SCREEN-FLEET-SCALE-1, fleet management scaled architecturally but provisioning remained embedded in `ScreenManagementWorkspacePanel` as React dialogs:

| Concern | Previous behavior |
|---------|-------------------|
| Create screen | Modal dialog |
| QR / credentials | Second modal, ephemeral React state |
| Rotation | Fleet card action + modal |
| State | None — no provisioning lifecycle |
| Refresh | Lost credentials and dialog state |
| Pairing observation | None on operator side |

This was adequate for small deployments but incompatible with an Operations Platform where provisioning is a tracked lifecycle.

---

## 3. Architecture Decision

**Decision:** Introduce `ProvisioningSession` contract, `ProvisioningSessionManager` state authority, and `ProvisioningWorkspacePanel` as a dedicated dashboard workspace (`section=screen-provisioning`).

**Rationale:**
- Provisioning lifecycle is explicit and observable
- Fleet delegates provision/status — no duplicated flows
- Credentials and QR live in workspace, not dialogs
- Rotation is a provisioning operation, not a fleet action
- Timeout/retry managed outside presentation components
- Refresh survival via URL + sessionStorage

---

## 4. Provisioning Workspace Architecture

```
Fleet Workspace
  │ Provision screen / Provision card / View status
  ▼
Provisioning Workspace (section=screen-provisioning)
  │
  ├─ ProvisioningSessionManager (authority)
  ├─ useProvisioningWorkspace (polling + timeout ticks)
  ├─ ProvisioningStatusPanel (health projection)
  ├─ ProvisioningCredentialsPanel (QR + copy)
  └─ Diagnostics (dev)
        │
        ▼
Device Runtime (/screen/pair → /screen)
```

---

## 5. Provisioning Session Contract

```typescript
ProvisioningSession {
  sessionId, screenId, deviceId, tokenId
  restaurantId, displayName, role
  status: ProvisioningStatus
  pairingState: ProvisioningPairingState
  activationState: ProvisioningActivationState
  startedAt, updatedAt, expiresAt
  credentials: ProvisioningQrPayload | null
  warnings, errors
  rotationCount, retryCount
  mode: "create" | "rotate" | "resume"
}
```

**Location:** `client/src/lib/screen-provisioning/provisioningSessionContract.ts`

---

## 6. Provisioning State Model

| State | Meaning |
|-------|---------|
| `created` | Session started, no credentials |
| `credentials_ready` | Token issued, QR available |
| `waiting_for_pairing` | Awaiting device scan |
| `pairing` | Pairing in progress |
| `connected` | Device paired (seen) |
| `activating` | Runtime loading |
| `operational` | Screen operational |
| `expired` | Session timeout |
| `cancelled` / `failed` | Terminal |

Projected by `provisioningStateProjector.ts` from fleet device snapshot — no UI calculation.

---

## 7. Pairing Model

| State | Trigger |
|-------|---------|
| `unpaired` | No credentials |
| `pairing` | Credentials issued, device not seen |
| `paired` | Device heartbeat observed |
| `revoked` | No active token |
| `unknown` | Indeterminate |

Separate from provisioning status — composed in projector.

---

## 8. Activation Model

| State | Trigger |
|-------|---------|
| `pending` | Not yet paired |
| `loading_configuration` | Online, ready state |
| `loading_capabilities` | Online, pre-operational |
| `loading_runtime` | Initializing |
| `operational` | Fleet canonical operational |
| `blocked` | Blocked role |
| `failed` | Device disabled |

Aligned with SCREEN-STATE-MODEL-1 fleet projections.

---

## 9. Fleet Integration

| Before | After |
|--------|-------|
| "New screen" dialog | Navigate to provisioning workspace (`mode=create`) |
| Fleet card "Rotate" | Fleet card "Provision" / "Status" → provisioning workspace |
| QR dialog in fleet | Removed — zero `<Dialog>` in fleet panel |

`FleetScreenCard` actions: Settings, Provision/Status, Disable only.

---

## 10. Runtime Integration

- Reuses existing `management.create` and `rotateToken` APIs
- Polls `fleet.queryScreens` for device canonical state
- Pairing protocol unchanged (`OperationalScreenPairingPayload` v2)
- Device runtime (`/screen/pair`) unchanged

---

## 11. Health Architecture

`projectProvisioningHealth()` projects:

- Provisioning status, pairing state, activation state
- Expiration flag and countdown seconds
- Retry and rotation counts
- Warning/error counts

Presentation consumes `ProvisioningHealth` only.

---

## 12. Diagnostics

`projectProvisioningDiagnostics()` includes:

- Full session snapshot
- Health projection
- Observability metrics (provision/pairing/activation duration, retries, expirations)
- Pairing and activation timelines

Exposed in dev diagnostics panel within provisioning workspace.

---

## 13. Observability

`ProvisioningSessionManager.getDiagnostics()` exposes:

- `provisionDurationMs`
- `pairingDurationMs`
- `activationDurationMs`
- `retryCount`
- `expirationCount`

Future telemetry programs consume these metrics.

---

## 14. Files Added

| File | Purpose |
|------|---------|
| `client/src/lib/screen-provisioning/provisioningSessionContract.ts` | Session + state contracts |
| `client/src/lib/screen-provisioning/provisioningSessionStore.ts` | sessionStorage persistence |
| `client/src/lib/screen-provisioning/provisioningStateProjector.ts` | State projection from fleet snapshot |
| `client/src/lib/screen-provisioning/ProvisioningSessionManager.ts` | Single provisioning authority |
| `client/src/lib/screen-provisioning/projectProvisioningHealth.ts` | Health projection |
| `client/src/lib/screen-provisioning/projectProvisioningDiagnostics.ts` | Diagnostics projection |
| `client/src/lib/screen-provisioning/provisioningUrl.ts` | URL routing for refresh survival |
| `client/src/lib/screen-provisioning/useProvisioningWorkspace.ts` | Workspace hook (polling + timeout) |
| `client/src/components/screen-provisioning/ProvisioningWorkspacePanel.tsx` | Operational workspace |
| `client/src/components/screen-provisioning/ProvisioningCredentialsPanel.tsx` | QR + credentials |
| `client/src/components/screen-provisioning/ProvisioningStatusPanel.tsx` | Status display |
| `client/src/lib/screen-provisioning/__tests__/*` | Tests + architecture guards |
| `docs/engineering/programs/SCREEN-PROVISIONING-WORKSPACE-1/IMPLEMENTATION.md` | This report |

---

## 15. Files Modified

| File | Change |
|------|--------|
| `client/src/components/screen-management/ScreenManagementWorkspacePanel.tsx` | Removed dialogs; fleet → provisioning navigation |
| `client/src/components/screen-management/FleetScreenCard.tsx` | Provision/Status actions; rotation removed |
| `client/src/components/dashboard/layout/types.ts` | Added `screen-provisioning` tab |
| `client/src/lib/dashboardUrl.ts` | URL mapping for provisioning section |
| `client/src/pages/Dashboard.tsx` | Renders `ProvisioningWorkspacePanel` |

---

## 16. Validation

| Criterion | Status |
|-----------|--------|
| ProvisioningSession contract | ✓ |
| Provisioning Workspace | ✓ |
| Provisioning state model | ✓ |
| Pairing state | ✓ |
| Activation state | ✓ |
| Provisioning health | ✓ |
| Diagnostics | ✓ |
| Fleet integration | ✓ |
| Workspace survives refresh | ✓ (URL + sessionStorage) |
| No provisioning logic in dialogs | ✓ |
| No duplicated state | ✓ |

---

## 17. Test Results

```
vitest run client/src/lib/screen-provisioning client/src/lib/screen-fleet server/operational-device

 Test Files  11 passed (11)
      Tests  50 passed (50)

tsc --noEmit → clean
```

**Provisioning tests (10):** state projector, session manager persistence, architecture guards (6).

---

## 18. Production Risks

| Risk | Mitigation |
|------|------------|
| Credentials in sessionStorage | Operator-session only; cleared on cancel; not in URL |
| Rotate on fleet entry requires network | Loading state shown; retry via workspace |
| 30-minute session timeout | Extend via retry action |
| Blocked roles show `activationState: blocked` | Expected per ROLE-RUNTIME-1 |

---

## 19. Future Programs

| Program | Builds on |
|---------|-----------|
| Push pairing notifications | Provisioning session events |
| Bulk provisioning | Multi-session manager |
| Camera QR scanning | Workspace scan panel |
| Cross-restaurant provisioning | Tenant-scoped sessions |
| Telemetry ingest | Observability metrics export |

---

## 20. Architecture Compliance Review

| Rule | Compliance |
|------|------------|
| No provisioning in dialogs | ✓ Fleet panel has no Dialog |
| No duplicate provisioning flows | ✓ Single workspace |
| Fleet cards lightweight | ✓ Delegate to workspace |
| No credentials fetch in presentation | ✓ Manager + mutations in workspace panel only |
| No duplicated pairing state | ✓ Projector + manager |
| No provisioning status in UI components | ✓ StatusPanel consumes health |
| No browser timers in presentation | ✓ Timers in useProvisioningWorkspace hook |
| QR format unchanged | ✓ Same qrPayload from server |
| API/DB unchanged | ✓ |

---

## 21. Evidence

### Fleet panel — no dialogs

Architecture guard: `ScreenManagementWorkspacePanel` does not contain `<Dialog`, `qrOpen`, or `createOpen`.

### Provisioning URL survives refresh

```
/dashboard?restaurant=1&section=screen-provisioning&provisionSession=prov_…
```

Session credentials restored from `sessionStorage` key `mineuqr:provisioning-sessions:v1`.

### State projection test

```
credentials + never_seen → waiting_for_pairing
fleet operational → provisioning status operational
```

---

## 22. Final Certification Decision

**CERTIFIED**

SCREEN-PROVISIONING-WORKSPACE-1 Phase C is complete. Provisioning is a first-class Operational Workspace with explicit session lifecycle, canonical state models, health/diagnostics projections, fleet integration, and refresh survival. All tests pass. The architecture demonstrates provisioning as a lifecycle — not a popup.
