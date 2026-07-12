# SCREEN-AUTH-401-FORENSICS-1

**Classification:** Production Incident Investigation (Forensics Only)  
**Severity:** P1  
**Status:** Investigation complete — **no code or data changes**  
**Date:** 2026-07-12  
**Related:** SCREEN-AUTHENTICATION-FORENSICS-1 (prior), MIGRATION-COMPATIBILITY-0063-1, SCREEN-MANAGEMENT-UX-1A…1E

---

## Executive Summary

Production `/screen` fails with **HTTP 401** on the first authenticated runtime call (`operationalDevice.runtime.getStatus`). The browser **does present a device Authorization header** sourced from `localStorage` (`mineuqr:operational-screen:credentials:v1`), but the server **rejects** those credentials in `OperationalDeviceAuthService.resolveCredentialOutcome` (invalid / revoked / expired / disabled).

A **secondary client defect** then keeps the UI stuck on the loading spinner: auth-error handling in `useRuntimeOrchestrator` is unreachable when `statusQuery.data` is absent, so stale credentials are **not cleared** and the operator is **not redirected** to `/screen/pair`.

Provisioning “Device Connecting” / waiting-for-connection is a **downstream symptom**: without a successful runtime heartbeat, fleet presence stays `never_seen`, so the provisioning projector never advances to operational.

**Migration 0063 and Screen Management UX-1A–1E did not change authentication, pairing, or credential validation.** They are not the cause of the 401.

**Root Cause Identified** (credential mismatch between browser localStorage and server active token), with a confirmed aggravating hang bug in bootstrap auth-error handling.

---

## Production Evidence

| Observation | Interpretation |
|-------------|----------------|
| `/screen` loads but never becomes operational | Entry page found localStorage credentials (else would redirect to `/screen/pair`) |
| Console: HTTP 401 from `/api/trpc/operational…` | `deviceProcedure` rejected Authorization |
| Screen stuck loading | `OperationalScreenEntry` shows spinner while `!context`; bootstrap never completes |
| Provisioning waits for connection | Fleet presence never updates without heartbeat |
| Architecture expects permanent credentials | Correct; permanent credential **exists server-side**, but **browser holds a different/stale secret or revoked tokenId** |

---

## Root Cause Analysis

### Primary cause (401)

The runtime sends:

```http
Authorization: Device {deviceId}:{tokenId}:{secret}
```

built from **browser localStorage**. Server validates against `operational_device_tokens.secretHash` for an **active** token matching `deviceId` + `tokenId`.

401 occurs when any of these hold (all map to `validateCredentials` → `null` → middleware UNAUTHORIZED):

1. **Token revoked/rotated** after Regenerate Credential / rotate / delete (most common after operator lifecycle actions)
2. **Secret mismatch** (localStorage secret ≠ current `secretHash`)
3. **tokenId mismatch** (localStorage tokenId is old; new active token has a different id)
4. **Device missing or disabled**
5. **Token expired** (if `expiresAt` set)

This is **not** missing Authorization (that also 401s, but would typically follow empty localStorage → redirect to pair). Presence of a prolonged loading state proves credentials were **read** from localStorage.

### Secondary cause (infinite loading)

In `useRuntimeOrchestrator.ts`, bootstrap effect:

```ts
if (!bootstrapMayExecute(phase)) return;
if (!statusQuery.data) return; // ← exits BEFORE auth-error handling

if (statusQuery.error && isDeviceAuthError(statusQuery.error)) {
  handleRevoked(); // never reached on 401-only failure
}
```

A parallel effect for non-auth errors **explicitly skips** auth errors. Therefore 401 leaves phase in validating/loading, credentials uncleared, spinner forever.

### Provisioning symptom

`provisioningStateProjector`: credentials issued + fleet `presence === "never_seen"` → `pairingState: "pairing"` → status `waiting_for_pairing`. Without successful `/screen` bootstrap + heartbeat, presence never becomes online → workspace never reaches operational. UI copy (“Device connecting” / “Waiting for connection”) reflects that wait.

---

## Authentication Flow Diagram

```
Browser /screen
  → readOperationalScreenCredentials()     [localStorage key v1]
  → ScreenRuntimeProvider + Orchestrator
  → Authorization: Device deviceId:tokenId:secret   [credentials: omit — no cookies]
  → GET/POST /api/trpc/operationalDevice.runtime.getStatus
  → deviceProcedure → resolveDeviceSessionFromRequest
  → parseAuthorizationHeader
  → validateCredentials / resolveCredentialOutcome
       ├─ device missing/disabled
       ├─ token missing / wrong device / revoked / expired
       └─ verifyDeviceSecret(secret, secretHash) fails
  → null session → TRPCError UNAUTHORIZED (401)
  → statusQuery.error set, statusQuery.data undefined
  → bootstrap effect early-return (hang)
```

**Not used on `/screen` resume:** cookies, JWT, dashboard session, provisioning sessionStorage, activation codes.

**Pairing path (`/screen/pair`)** calls `runtime.authenticate` (publicProcedure) **before** writing localStorage; if that succeeds, the same material must pass `getStatus`. Fresh successful pair should not 401 unless race with concurrent regenerate/delete.

---

## Runtime Bootstrap Trace

| Step | Function / component | Role |
|------|----------------------|------|
| 1 | Route `/screen` → `OperationalScreenEntry` | Entry |
| 2 | `readOperationalScreenCredentials()` | Load deviceId, tokenId, secret |
| 3 | Missing → `spaNavigate("/screen/pair")` | Pairing redirect |
| 4 | Present → `ScreenRuntimeProvider` / `OperationalScreenRuntimeProvider` | Wire device tRPC |
| 5 | `createScreenRuntimeTrpcLinks` → `formatDeviceAuthHeader` | Set Authorization |
| 6 | `useRuntimeOrchestrator` | Lifecycle owner |
| 7 | `dispatch(CREDENTIALS_FOUND)` | loading → validating |
| 8 | `screenTrpc…runtime.getStatus.useQuery` | **First authenticated call** |
| 9 | On success → `executeRuntimeBootstrap` → RuntimeContext → heartbeat | Operational |
| 10 | On 401 → hang (see secondary defect) | Stuck loading |

Functions involved: `OperationalScreenEntry`, `credentialStore`, `screenTrpcLinks`, `formatDeviceAuthHeader`, `useRuntimeOrchestrator`, `isDeviceAuthError`, `resolveDeviceSessionFromRequest`, `OperationalDeviceAuthService`, `deviceProcedure`, `operationalDeviceRuntimeRouter.getStatus`.

---

## Credential Lifecycle Trace

```
Create Screen (management.create)
  → issue permanent token (secretHash + optional secretCiphertext)
  → operator QR (recovery SVG; plaintext secret only in pairing payload / QR decode)
        ↓
Pair (/screen/pair)
  → parse QR/manual → runtime.authenticate
  → writeOperationalScreenCredentials(localStorage)
  → navigate /screen
        ↓
Runtime
  → getStatus + heartbeat with same Device Authorization
        ↓
Regenerate Credential / rotate / Delete Screen
  → revoke prior active token(s); issue new token OR delete device
  → **browser localStorage NOT updated by management UI**
        ↓
Next /screen open with stale localStorage → 401
```

**Same credential survives the lifecycle only if** the browser was paired with the **currently active** server token and no regenerate/delete occurred since.

Provisioning session (`sessionStorage`) holds recovery QR for the **operator** dashboard only. It is **not** the runtime auth source.

---

## Database Verification

**This forensics pass did not execute production SQL** (no modify / no live query in-session).

Prior certified context (PRODUCTION-MIGRATION-EXECUTION-0063 / SCREEN-AUTHENTICATION-FORENSICS-1):

- Migration 0063 added nullable `secretCiphertext` after `secretHash` — **auth path does not read ciphertext**
- Auth continues to use `secretHash` + `verifyDeviceSecret` only

**Recommended read-only production checks** (operator/DBA):

```sql
-- Active screens
SELECT deviceId, displayName, status, lastSeenAt FROM operational_devices WHERE status = 'active';

-- Active credentials per device
SELECT tokenId, deviceId, status, revokedAt, expiresAt,
       (secretCiphertext IS NOT NULL) AS hasRecovery
FROM operational_device_tokens
WHERE status = 'active' AND revokedAt IS NULL;

-- Compare browser localStorage.deviceId / tokenId to these rows (secret never logged)
```

Confirm: screen exists; active token exists; browser `tokenId` matches active row; device not deleted/disabled. **Do not** log or compare plaintext secrets in tickets.

---

## Server Authentication Trace

```
Incoming /api/trpc … getStatus
  → createContext(req)
  → deviceProcedure / requireDeviceSession
  → resolveDeviceSessionFromRequest(req)
  → Authorization header parse ("Device a:b:c")
  → if parse fail → null → 401 "Valid operational device credentials required"
  → validateCredentials → resolveCredentialOutcome
       getDevice → active?
       getToken → belongs to device? active? not revoked? not expired?
       verifyDeviceSecret(secret, secretHash)
  → fail any step → null → 401 (generic message; failure code not exposed on deviceProcedure)
  → success → ctx.deviceSession → getStatus handler
```

**Exact rejection point for invalid material:** `requireDeviceSession` when `resolveDeviceSessionFromRequest` returns `null` (`server/_core/trpc.ts`).

---

## Runtime Request Inspection

| Field | Expected |
|-------|----------|
| Endpoint | `operationalDevice.runtime.getStatus` |
| Transport | `/api/trpc` (batch possible) |
| Header | `Authorization: Device {deviceId}:{tokenId}:{secret}` |
| Cookies | **Omitted** (`credentials: "omit"`) |
| JWT / user session | **Not used** |
| Payload | none (query) |

If Network tab shows 401 **with** Authorization present → server rejected credential material.  
If Authorization absent → client link miswired (not indicated by hang-with-credentials path).

---

## Contract Compliance Review

| Contract | Compliant? |
|----------|------------|
| Permanent screen identity + permanent credential | Yes (server) |
| Runtime auth = deviceId + tokenId + secret vs secretHash | Yes |
| Recovery ciphertext ≠ authentication | Yes |
| `/screen` does not depend on provisioning session | Yes |
| Activation-code auth for bootstrap | Effectively disabled (always invalid) — by design post-governance |
| After regenerate, browser auto-rebinds | **No** — requires re-pair; localStorage stale until pair |

No evidence runtime depends on provision session after pairing completes.

---

## Architecture Violations (if any)

| Item | Severity | Notes |
|------|----------|-------|
| Bootstrap auth-error dead path (`!statusQuery.data` before `handleRevoked`) | **Defect** | Violates expected revoke → clear → `/screen/pair` recovery |
| Management Regenerate/Delete does not clear device browsers | By design (fleet vs runtime) | Operators must re-open setup; UX impact panels document this |
| Generic 401 message (no `token_revoked` on deviceProcedure) | Observability gap | Client still detects UNAUTHORIZED via `isDeviceAuthError` |

UX-1A–1E: **no auth contract violation** (presentation only).

---

## Regression Analysis

| Change | Auth impact |
|--------|-------------|
| Migration 0063 `secretCiphertext` | None (auth uses `secretHash`) |
| SCREEN-MANAGEMENT-UX-1A…1E | None (presentation / copy / tabs / table actions) |
| RUNTIME-RECONCILIATION-ARCHITECTURE-1 | Eliminated reconcile loops; **left** auth-error ordering hang |
| Credential lifecycle / regenerate | Expected to invalidate old browser credentials |

**No production regression introduced by UX roadmap.** Incident matches **stale browser credential after lifecycle ops**, amplified by bootstrap hang — consistent with SCREEN-AUTHENTICATION-FORENSICS-1.

---

## Minimal Safe Fix Recommendation

**Do not implement until approved.** Suggested minimal sequence:

1. **Client recovery (minimal):** In `useRuntimeOrchestrator`, handle `statusQuery.error` + `isDeviceAuthError` **without** requiring `statusQuery.data`; call existing `handleRevoked()` (clear localStorage → `/screen/pair`).
2. **Operator runbook (immediate, no deploy):** On affected device: clear site data / localStorage key `mineuqr:operational-screen:credentials:v1`, open **Setup link** / `/screen/pair`, scan current QR.
3. **Do not:** retries, token refresh, session TTL extension, auth bypass, schema changes.

Optional follow-on (separate program): RUNTIME-BOOTSTRAP-AUTH-REVOCATION-1 for stronger revoke UX.

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Devices remain stuck after regenerate without re-pair | High | Runbook + approved hang fix |
| Mis-attributing 401 to migration 0063 | Medium | Auth path evidence above |
| Fixing hang without confirming DB active token | Medium | Read-only token check before claiming env-wide outage |
| Broad credential wipe | High | Avoid; re-pair only affected browsers |

---

## Final Verdict

**Root Cause Identified**

Primary: **Stale or mismatched operational screen credentials in browser `localStorage` rejected by server device authentication on `runtime.getStatus`.**

Secondary: **Bootstrap does not process 401 into credential clear + pairing redirect when `statusQuery.data` is empty, producing infinite loading; provisioning wait is consequential.**

Migration 0063 and Screen Management UX programs are **unrelated** to the 401 rejection itself.
