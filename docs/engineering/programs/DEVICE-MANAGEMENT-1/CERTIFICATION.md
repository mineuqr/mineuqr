# DEVICE-MANAGEMENT-1 — Certification Report

**Date:** 2026-07-04  
**Program:** DEVICE-MANAGEMENT-1  
**Architecture basis:** Architecture Constitution, READ-ARCHITECTURE-1, OPERATIONAL-WORKSPACE-1, KITCHEN-DISPLAY-ARCHITECTURE-1 Revision B  
**Status:** **CERTIFIED**

---

## 1. Implementation Summary

MineuQR now includes a production **Operational Device Platform**. Operational devices are first-class identities separate from dashboard users. Each device has a role, restaurant scope, optional branch scope, hashed device token, heartbeat telemetry, version reporting, and online/offline presence. Operators manage devices through a **Device Management Workspace** (verified user session). Devices authenticate via `Device deviceId:tokenId:secret` credentials and access role-scoped runtime endpoints only — never dashboard RBAC or user sessions.

---

## 2. Repository Integration

| Integration | Mechanism |
|-------------|-----------|
| Device registry | `operational_devices` + `operational_device_tokens` (migration `0054`) |
| Operator management | `operationalDevice.management.*` tRPC (`verifiedProcedure` + `assertRestaurantAccess`) |
| Device runtime | `operationalDevice.runtime.*` tRPC (`deviceProcedure` — token auth only) |
| Kitchen execution | `runtime.getKitchenQueue` for `kitchen_display` / `expo_display` roles via Q-20 |
| Print monitor | `runtime.getPrintMonitorSummary` for `print_monitor` role |
| Dashboard | New **Devices** tab → `DeviceManagementWorkspacePanel` |
| UI pattern | OPERATIONAL-WORKSPACE-1 shell (KPIs, Operations Bar, grid) |

---

## 3. Files Added

| Path | Purpose |
|------|---------|
| `drizzle/0054_operational_devices.sql` | Registry + token tables |
| `server/operational-device/domain/*` | Roles, contracts, health |
| `server/operational-device/infrastructure/*` | Crypto, Drizzle + in-memory stores |
| `server/operational-device/services/*` | Registry, auth, heartbeat |
| `server/operational-device/middleware/resolveDeviceSession.ts` | Header parsing + validation |
| `server/operational-device/routers/*` | Management + runtime routers |
| `server/operational-device/__tests__/*` | Unit + architecture guards |
| `client/src/lib/operational-device/*` | Labels, auth header helper |
| `client/src/components/device-management/DeviceManagementWorkspacePanel.tsx` | Management workspace UI |

---

## 4. Files Modified

| Path | Change |
|------|--------|
| `drizzle/schema.ts` | `operationalDevices`, `operationalDeviceTokens` |
| `server/_core/trpc.ts` | `deviceProcedure` middleware |
| `server/_core/context.ts` | Optional `deviceSession` on context type |
| `server/routers.ts` | Register `operationalDevice` router |
| `client/src/pages/Dashboard.tsx` | Devices tab |
| `client/src/components/dashboard/layout/types.ts` | `devices` tab type |
| `client/src/components/dashboard/layout/RestaurantDashboardSidebar.tsx` | Nav item |
| `client/src/lib/dashboardUrl.ts` | URL mapping |

---

## 5. Architecture Compliance

| Rule | Status |
|------|--------|
| Devices are NOT users | ✅ Separate tables, auth, procedures |
| No user sessions for devices | ✅ `deviceProcedure` only |
| No dashboard RBAC on device endpoints | ✅ Runtime router excludes `verifiedProcedure` |
| Device token auth only | ✅ `Authorization: Device …` header |
| Token rotation + revocation | ✅ `rotateToken`, `revokeToken`, disable revokes tokens |
| Restaurant isolation | ✅ All queries scoped by `restaurantId` |
| Branch isolation | ✅ Optional `branchId` on device record |
| Supported roles (6) | ✅ All roles in schema + UI |
| No dashboard exposure on device endpoints | ✅ Read-only role-scoped runtime |
| Read architecture unchanged | ✅ Kitchen/print reads reuse existing read services |

---

## 6. Operational Validation

- Create device → returns one-time token + QR JSON payload  
- Disable device → revokes tokens, blocks authentication  
- Rotate token → prior token marked `rotated`, new active token issued  
- Heartbeat → updates `lastSeenAt` + `reportedVersion`  
- Online/offline → 120s threshold (`DEVICE_OFFLINE_THRESHOLD_MS`)  
- Health summary KPIs in management workspace  

---

## 7. Security Validation

- Secrets stored as SHA-256 hashes only  
- Timing-safe secret comparison  
- Revoked/rotated/expired tokens rejected  
- Disabled devices cannot authenticate  
- Device credentials parsed separately from session cookies  
- Management mutations require verified operator + restaurant access  

---

## 8. Performance Validation

- Device list health polling: 30s (management UI)  
- Indexed queries: `(restaurantId, status)`, `(deviceId, status)`  
- In-memory store for fast unit tests; Drizzle for production  
- No N+1 on list — single query per restaurant + per-device active token lookup (bounded per restaurant)  

---

## 9. Test Results

```
server/operational-device/__tests__/deviceHealth.test.ts              3/3
server/operational-device/__tests__/OperationalDeviceServices.test.ts 5/5
server/operational-device/__tests__/deviceManagementArchitecture.test.ts 4/4
client/src/lib/operational-device/__tests__/deviceLabels.test.ts      1/1
TypeScript check                                                      clean
```

---

## 10. Final Certification

**DEVICE-MANAGEMENT-1 is CERTIFIED.**

The Operational Device Platform is production-ready: registry, identity, roles, token lifecycle, device authentication, heartbeat, health, role-scoped endpoints, QR provisioning, restaurant/branch isolation, and a unified management workspace — without conflating devices with dashboard users.

**Note:** Run `drizzle/0054_operational_devices.sql` migration before deploying.
