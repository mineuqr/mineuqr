# DEVICE-PROVISIONING-UX-2 — URL + Activation Code Provisioning

**Program:** DEVICE-PROVISIONING-UX-2  
**Type:** Product Readiness  
**Date:** 2026-07-07  
**Decision:** **CERTIFIED** (pending deployment after migration `0060`)

---

## 1. Executive Summary

Operational screen provisioning no longer assumes a camera on the target device. **URL + activation code** is the canonical operator workflow; **QR remains optional** and collapsed by default. The PAIRING-CONTRACT-1 v2 credential model and `authenticate` API are unchanged — a new **`authenticateByActivationCode`** entry point resolves short codes to the same device session security model.

---

## 2. Architecture Decision

| Decision | Rationale |
|----------|-----------|
| Primary: `https://www.mineuqr.com/device` + `XXXX-XXXX` code | Works on any browser/device without camera |
| QR optional, hidden by default | Backward compatible; not primary UX |
| Additive server endpoint | No change to v2 QR JSON or `authenticate` input |
| Single-use activation codes | Hash cleared on redeem; 30-minute TTL |
| Bootstrap credentials on code redeem | Device runtime still uses `Device deviceId:tokenId:secret` |

**Rejected:** Client-only encoded mega-codes (poor UX, weak “short code” goal); removing QR entirely (compatibility requirement).

---

## 3. Updated Provisioning UX

### Operator (Dashboard)

1. **Provision Screen** → create device session  
2. **ProvisioningActivationPanel** shows:
   - Device URL (copy)
   - Activation code `XXXX-XXXX` (copy)
   - Session time remaining
   - **Show QR code (optional)** — collapsed
3. When device connects → **ProvisioningPendingDevicePanel** (Approve / Reject)
4. Approve → continue lifecycle observation; Reject → `disable` device

### Device (`/device`)

1. **Activate Device** landing  
2. Activation code input + **Connect**  
3. `authenticateByActivationCode` → bootstrap credentials → `/screen` runtime  
4. No camera required

### Legacy paths

- `/screen/pair` — JSON paste + manual credentials (updated copy)
- Optional QR — same v2 payload as before

---

## 4. Implementation Summary

### Backend

| Item | Path |
|------|------|
| Migration `0060_device_activation_code` | `drizzle/0060_device_activation_code.sql` |
| Code generation / hash | `server/operational-device/infrastructure/deviceCrypto.ts` |
| Token fields | `activationCodeHash`, `activationCodeExpiresAt` |
| Issue on create/rotate | `OperationalDeviceRegistryService.issueToken` |
| `authenticateByActivationCode` | `OperationalDeviceAuthService` |
| Public tRPC | `operationalDevice.runtime.authenticateByActivationCode` |
| Management response | `activationCode` on create/rotate |

### Frontend

| Item | Path |
|------|------|
| Activation URL helper | `client/src/lib/device-activation/deviceActivationUrl.ts` |
| Primary dashboard panel | `ProvisioningActivationPanel.tsx` |
| Optional QR | `ProvisioningOptionalQrPanel.tsx` |
| Pending approval | `ProvisioningPendingDevicePanel.tsx` |
| Device landing | `pages/device/DeviceActivationPage.tsx`, `DeviceActivationShell.tsx` |
| Route | `/device` in `App.tsx` |

### Copy updates

- Removed “scan this QR code” as primary language
- `PairingShell`, `ScreenConnectionBanner` updated

---

## 5. Compatibility Report

| Path | Status |
|------|--------|
| QR v2 JSON pairing | **Works** — optional panel + `/screen/pair` |
| `authenticate(deviceId, tokenId, secret)` | **Unchanged** |
| Credential auth consumes activation code | **Yes** — prevents dual-use with code after QR |
| Code redeem before QR | **Rotates device secret** — QR from create response invalidated (code-first workflow) |
| QR before code | **Works** — code hash cleared on credential auth |

---

## 6. Validation Results

| Check | Result |
|-------|--------|
| `tsc --noEmit` | PASS |
| Operational device tests | PASS (incl. activation code auth) |
| Provisioning workspace tests | PASS |
| UX architecture guards | PASS |
| Provisioning without QR (code path) | Implemented |
| Copy URL / Code | Implemented |
| `/device` route | Implemented |
| Approve / Reject UI | Implemented (Reject → disable) |

---

## 7. Production Readiness Assessment

| Criterion | Status |
|-----------|--------|
| Security model preserved | Yes — codes hashed, TTL, single-use |
| Protocol v2 unchanged | Yes |
| Migration required | **Yes — `0060_device_activation_code`** |
| Deployment gate | **Wait for certification sign-off + migration** |

**Recommendation:** Apply migration `0060` in next release window, then deploy client + server together.

---

## 8. Operator Quick Reference

```
Dashboard → Screen Management → Provision screen
  → Copy URL: https://www.mineuqr.com/device
  → Copy code: XXXX-XXXX

On device browser:
  → Open URL → enter code → Connect
```

Optional: expand “Show QR code” on dashboard for camera-capable devices.
