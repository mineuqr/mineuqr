# SCREEN-PAIRING-CODE-1 — Implementation Report

**Program:** SCREEN-PAIRING-CODE-1 — Pairing Domain & Bootstrap Flow  
**Status:** IMPLEMENTED  
**Date:** 2026-07-12

---

## Summary

Implemented the certified **Pairing Domain** as the sole bootstrap mechanism for installing permanent device credentials. Runtime authentication is unchanged: after pairing, all sessions use `Authorization: Device {deviceId}:{tokenId}:{secret}`.

---

## Pairing Domain Components Introduced

| Component | Path | Role |
|-----------|------|------|
| Pairing crypto | `server/operational-device/pairing/pairingCrypto.ts` | Generate, normalize, hash 6-char pairing codes |
| Pairing contracts | `server/operational-device/pairing/pairingContracts.ts` | Redeem result types and failure codes |
| Pairing service | `server/operational-device/pairing/ScreenPairingService.ts` | One-time `redeemPairingCode` bootstrap |
| Redeem messages | `client/src/lib/operational-screen/pairing/pairingRedeemMessages.ts` | Operator-safe pairing error copy |
| Credential hook | `client/src/lib/operational-screen/useOperationalScreenCredentials.ts` | Reactive `/screen` pairing ↔ runtime switch |

Internal storage reuses existing `activationCodeHash` / `activationCodeExpiresAt` columns with **Pairing** domain semantics only.

---

## Bootstrap Flow Changes

### Issuance (create / regenerate)

```
Create Screen → issueToken()
  → permanent credential (secretHash + secretCiphertext)
  → pairing code (hash stored server-side)
  → management response: pairingCode + recoveryQrSvg (compatibility)
```

### Redemption (device)

```
/screen (no credential) → PairingShell
  → redeemPairingCode
  → authenticate (validates permanent credential)
  → writeOperationalScreenCredentials
  → /screen runtime starts
```

### Recovery (SCREEN-AUTH-RECOVERY-1)

```
401 → clearOperationalScreenCredentials → credential change event
  → OperationalScreenEntry shows PairingShell at /screen
  → enter new pairing code after regenerate
```

---

## Files Modified

### Server

- `server/operational-device/pairing/pairingCrypto.ts` *(new)*
- `server/operational-device/pairing/pairingContracts.ts` *(new)*
- `server/operational-device/pairing/ScreenPairingService.ts` *(new)*
- `server/operational-device/domain/deviceContracts.ts`
- `server/operational-device/services/OperationalDeviceRegistryService.ts`
- `server/operational-device/services/OperationalDeviceAuthService.ts` *(comment only)*
- `server/operational-device/operationalDeviceComposition.ts`
- `server/operational-device/infrastructure/deviceCredentialStorage.ts`
- `server/operational-device/routers/operationalDeviceRuntimeRouter.ts`
- `server/operational-device/routers/operationalDeviceManagementRouter.ts`
- `server/operational-device/__tests__/screenPairing.test.ts` *(new)*
- `server/operational-device/__tests__/screenPairingGovernance.test.ts` *(new)*
- `server/operational-device/__tests__/OperationalDeviceServices.test.ts`
- `server/operational-device/__tests__/screenCredentialLifecycle.test.ts`
- `server/operational-device/__tests__/screenCredentialGovernance.test.ts`

### Client

- `client/src/components/operational-screen/PairingShell.tsx`
- `client/src/pages/screen/OperationalScreenEntry.tsx`
- `client/src/pages/screen/OperationalScreenPair.tsx` *(redirect to /screen)*
- `client/src/lib/operational-screen/credentialStore.ts`
- `client/src/lib/operational-screen/useOperationalScreenCredentials.ts` *(new)*
- `client/src/lib/operational-screen/useRuntimeOrchestrator.ts`
- `client/src/lib/operational-screen/pairing/pairingRedeemMessages.ts` *(new)*
- `client/src/lib/screen-credential-lifecycle/screenEntryUrl.ts`
- `client/src/components/screen-provisioning/ProvisioningActivationPanel.tsx`
- `client/src/components/screen-provisioning/ProvisioningWorkspacePanel.tsx`
- `client/src/lib/screen-provisioning/provisioningSessionContract.ts`
- `client/src/lib/operational-screen/__tests__/authRecovery.guards.test.ts`
- `client/src/lib/operational-screen/__tests__/architectureGuards.test.ts`
- `client/src/lib/screen-provisioning/__tests__/provisioningWorkspace.test.ts`

---

## Runtime Integration

- **`/screen`** is the sole operator-facing entry point.
- **`OperationalScreenEntry`** renders `PairingShell` when no local credential exists; otherwise boots existing runtime stack unchanged.
- **`useRuntimeOrchestrator`** recovery and unpair redirect to `/screen` (not `/screen/pair`).
- **`/screen/pair`** legacy route redirects to `/screen`.
- **Credential store** emits change events so recovery on `/screen` re-renders without full page reload.

---

## Backward Compatibility Verification

| Scenario | Result |
|----------|--------|
| Existing paired devices (valid localStorage) | Unchanged — runtime auth only |
| Device Authorization header | Unchanged |
| Credential storage key/shape | Unchanged |
| `runtime.authenticate` | Unchanged — used post-redeem validation |
| Legacy `/screen/pair` bookmarks | Redirect to `/screen` |
| Recovery QR SVG | Still issued (compatibility); primary UX is pairing code |
| Legacy `authenticateByActivationCode` | Remains disabled |

---

## Security Verification

| Requirement | Implementation |
|-------------|----------------|
| Pairing code is not auth credential | Redeem only; never in Authorization header |
| Single-use redeem | `consumeActivationCode` clears hash after success |
| Invalidated on regenerate/delete | Token rotation revokes old token; delete revokes device |
| Secret not in management API | Management returns `pairingCode` only |
| Bootstrap decrypt isolated | `ScreenPairingService` + `ScreenCredentialRecoveryService` only |
| Auth service never decrypts | Governance tests pass |

---

## Test Results

| Suite | Result |
|-------|--------|
| `screenPairing.test.ts` | PASS (7) |
| `screenPairingGovernance.test.ts` | PASS (6) |
| Related operational device + client guard tests | PASS |
| Full repository `npm test -- --run` | **1923 PASS / 4 FAIL** (failures unrelated — see Repository Validation) |
| `npm run build` | PASS |

---

## Repository Validation Summary

**Validation date:** 2026-07-12  
**Purpose:** Certification gate — determine whether 4 repository test failures block SCREEN-PAIRING-CODE-1 certification.

| Check | Result |
|-------|--------|
| SCREEN-PAIRING-CODE-1 scope tests | PASS |
| Build | PASS |
| Repository tests | 1923 PASS / 4 FAIL |
| Failures exercise pairing-modified code | **No** |
| Regressions attributable to pairing | **No** |

---

## Repository Impact Analysis

SCREEN-PAIRING-CODE-1 modified only approved pairing scope:

| Area | Modified |
|------|----------|
| Pairing domain (`server/operational-device/pairing/*`) | Yes |
| Operational device registry / routers / composition | Yes |
| Runtime bootstrap (`OperationalScreenEntry`, `PairingShell`, orchestrator) | Yes |
| Credential store / provisioning activation | Yes |
| Pairing tests and guards | Yes |
| Pairing documentation | Yes |

**Not modified by SCREEN-PAIRING-CODE-1:**

| Area | Modified |
|------|----------|
| `server/session-owner-timeline.test.ts` | No |
| `server/diningSession/sessionOwnerTimeline.ts` | No |
| `server/connector-product/**` | No |
| `connector-product/release/connector-release.json` | No |
| `server/connector-product/release/connectorReleaseConstants.generated.ts` | No |

No dependency chain connects pairing-modified files to any failing test code path.

---

## Failing Test Analysis

### Failure 1

**Test Name:** `session.getOwnerTimeline UX-1C > returns session header and chronological V1 events`  
**File:** `server/session-owner-timeline.test.ts`

**Failure Output:**
```
AssertionError: expected { sessionId: 1, tableNumber: 5, …(3) } to deeply equal { … }
+ displayReference: null   (on each event — unexpected by test)
```

**Root Cause:** Production code `mapTableEventToOwnerTimeline()` in `server/diningSession/sessionOwnerTimeline.ts` includes `displayReference: string | null` on every event (line 53: `displayReference: null`). The integration test expectation was not updated when this field was added.

**Code Path:**
```
session.getOwnerTimeline (routers.ts)
  → getOwnerSessionTimeline (sessionOwnerTimeline.ts)
  → mapTableEventToOwnerTimeline (adds displayReference: null)
  → test assertion at session-owner-timeline.test.ts:88
```

**Dependency Chain:** Dining session router → session owner timeline mapper. No operational-device or pairing imports.

**Relationship to SCREEN-PAIRING-CODE-1:** **Pre-existing Failure**

**Evidence:**
- Field introduced in commit `dd9d591` (`feat(read-model): expand business identity across operational read models`) — predates pairing work; is ancestor of HEAD.
- Unit test `server/diningSession/sessionOwnerTimeline.test.ts` **was** updated to expect `displayReference: null`.
- Integration test `server/session-owner-timeline.test.ts` was **not** updated — stale expectation.
- SCREEN-PAIRING-CODE-1 file list contains zero dining-session or router timeline files.

**Blocks certification:** No — unrelated stale test.

---

### Failure 2

**Test Name:** `PRINT-CONNECTOR-RELEASE-1 release infrastructure > uses a single canonical manifest for product version`  
**File:** `server/connector-product/__tests__/connectorReleaseInfrastructure.test.ts`

**Failure Output:**
```
AssertionError: expected '1.0.2' to be '1.0.1'
Expected: "1.0.1"
Received: "1.0.2"
(at expect(manifest.version).toBe(GENERATED_VERSION))
```

**Root Cause:** Version drift. Canonical manifest `connector-product/release/connector-release.json` was bumped to `1.0.2` (commit `fbf3eda`, RELEASE-VERSION-1) but generated constants file `server/connector-product/release/connectorReleaseConstants.generated.ts` was not re-synced and still exports `MINEUQR_CONNECTOR_VERSION = "1.0.1"` (last touched commit `0e5ae4b`).

**Code Path:**
```
readConnectorReleaseManifest() → connector-release.json (version 1.0.2)
connectorReleaseConstants.generated.ts → GENERATED_VERSION 1.0.1
test compares manifest.version === GENERATED_VERSION
```

**Dependency Chain:** Connector release manifest → generated constants sync script (`npm run connector:sync-version`). No pairing code involved.

**Relationship to SCREEN-PAIRING-CODE-1:** **Pre-existing Failure**

**Evidence:**
- Drift introduced when `fbf3eda` changed only `connector-release.json` without running version sync.
- SCREEN-PAIRING-CODE-1 did not modify any `connector-product/` or `server/connector-product/` files.

**Blocks certification:** No — unrelated release infrastructure drift.

---

### Failure 3

**Test Name:** `PRINT-CONNECTOR-RELEASE-1 release infrastructure > derives installer filename consistently`  
**File:** `server/connector-product/__tests__/connectorReleaseInfrastructure.test.ts`

**Failure Output:**
```
AssertionError: expected 'MineuQR-Connector-1.0.2-Setup.exe' to be 'MineuQR-Connector-1.0.1-Setup.exe'
```

**Root Cause:** Same version drift as Failure 2. Installer filename is correctly derived from manifest version `1.0.2`, but test hardcodes expected filename `MineuQR-Connector-1.0.1-Setup.exe` at line 41.

**Code Path:**
```
getWindowsInstallerFileName(manifest) → uses manifest.version (1.0.2)
test hardcodes 1.0.1 filename
```

**Dependency Chain:** Same as Failure 2.

**Relationship to SCREEN-PAIRING-CODE-1:** **Pre-existing Failure**

**Evidence:** Same as Failure 2; hardcoded test assertion not updated after version bump.

**Blocks certification:** No.

---

### Failure 4

**Test Name:** `PRINT-CONNECTOR-RELEASE-1 architecture guards > dashboard API derives installer name from canonical manifest`  
**File:** `server/connector-product/__tests__/releaseInfrastructure.architecture.guards.test.ts`

**Failure Output:**
```
AssertionError: expected '1.0.1' to be '1.0.2'
Expected: "1.0.2"
Received: "1.0.1"
(at expect(info.version).toBe(manifest.version))
```

**Root Cause:** Same version drift. `ConnectorProductService.getDownloadInfo()` fallback returns `MINEUQR_CONNECTOR_VERSION` from stale generated constants (`1.0.1`), while `readConnectorReleaseManifest()` reads live JSON (`1.0.2`).

**Code Path:**
```
ConnectorProductService.getDownloadInfo()
  → MINEUQR_CONNECTOR_VERSION from connectorReleaseConstants.generated.ts (1.0.1)
readConnectorReleaseManifest()
  → connector-release.json (1.0.2)
test: info.version === manifest.version
```

**Dependency Chain:** Connector product service → generated version constants → release manifest JSON. No operational-screen or pairing imports.

**Relationship to SCREEN-PAIRING-CODE-1:** **Pre-existing Failure**

**Evidence:** Same `fbf3eda` / sync drift as Failures 2–3. No pairing files in dependency chain.

**Blocks certification:** No.

---

## Regression Determination Summary

| Test | Classification |
|------|----------------|
| session.getOwnerTimeline UX-1C | Pre-existing Failure |
| connectorReleaseInfrastructure (version) | Pre-existing Failure |
| connectorReleaseInfrastructure (filename) | Pre-existing Failure |
| releaseInfrastructure.architecture.guards | Pre-existing Failure |

**Direct Regression:** 0  
**Indirect Regression:** 0  
**Unrelated / Pre-existing:** 4

No evidence links any failure to SCREEN-PAIRING-CODE-1 changes.

---

## Repository Certification Status

```
Repository Certification Status

SCREEN-PAIRING-CODE-1 Scope:
PASS

Repository Build:
PASS

Repository Tests:
1923 Passed
4 Failed

Remaining Failures:
Pre-existing
Outside SCREEN-PAIRING-CODE-1 scope
No evidence of regression introduced
```

**Recommended remediation (separate programs, not blocking pairing certification):**

1. Update `server/session-owner-timeline.test.ts` expectations to include `displayReference: null` (align with `sessionOwnerTimeline.test.ts`).
2. Run `npm run connector:sync-version` and update hardcoded `1.0.1` assertions in connector release tests.

---

## Validation Scenarios

| # | Scenario | Covered by |
|---|----------|------------|
| 1 | Create Screen → Pairing Code issued | `screenPairing.test.ts` |
| 2 | Pair using code → auth succeeds | `screenPairing.test.ts` |
| 3 | Refresh without re-entering code | Existing credential store (manual/E2E) |
| 4 | Regenerate → old code invalid | `screenPairing.test.ts` |
| 5 | Delete screen → redeem fails | `screenPairing.test.ts` |
| 6 | Existing paired screens unaffected | No migration; auth unchanged |

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Pairing code guessing | Medium | 6-char alphabet + single-use + rate limit deferred to governance program |
| `/screen` recovery without navigation | Low | Credential change event on clear |
| Operator cannot retrieve code after redeem | Expected | Regenerate issues new code; `hasUnredeemedPairingCode` on getScreenCredential |
| Internal column name `activationCodeHash` | Low | Domain terminology is Pairing-only in product/API |

---

## Final Certification Recommendation

SCREEN-PAIRING-CODE-1 implementation is complete and scope-validated. All four repository test failures are pre-existing, outside pairing scope, and not caused by pairing changes.

**CERTIFICATION APPROVED**

The implementation:

- Introduces the dedicated Pairing domain with correct terminology
- Enables one-field pairing bootstrap at `/screen`
- Preserves permanent credential authentication architecture
- Maintains SCREEN-AUTH-RECOVERY-1 compatibility
- Passes build, pairing tests, and architecture guards
- Introduces no regressions in unrelated repository areas

**Suggested follow-up programs (not blocking certification):**

- RELEASE-VERSION-1 remediation — sync connector generated constants after manifest bump
- TABLE-MANAGEMENT / read-model — align `session-owner-timeline.test.ts` with `displayReference` field
- SCREEN-PAIRING-CODE-UX-1 — Screen Management Access tab pairing code display
- SCREEN-PAIRING-CODE-GOVERNANCE-1 — Rate limiting, audit logging, QR encodes pairing code only
