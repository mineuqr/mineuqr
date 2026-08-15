# REGRESSION-VALIDATION.md

Production data was not modified. No migration was applied. Checkout prices 19 / 39 / 99 USD were not written.

## This program

| Suite | Result |
|-------|--------|
| `commercialLivePlans.limits.repair.test.ts` | **PASS** (includes atomic rollback + cache) |
| `subscriptionPlanLimits.test.ts` | **7 passed** |
| `livePlanLimitsEditor.test.ts` | **2 passed** |
| `CommercialReadService.parity.test.ts` | **10 passed** (NONE → 0, no restaurant-scoped Basic fallback) |
| `commercialLivePlans.capabilityEditor.repair.test.ts` | **PASS** |
| `platformOwnerAccess.entitlements.test.ts` | **3 passed** |
| `assertCommercialAccountActive.test.ts` | **5 passed** |
| `subscriptionRuntimeEntitlement.enforcement.test.ts` | **14 passed** |

## Unchanged domains

| Domain | Proof |
|--------|--------|
| Capabilities | Capability editor repair suite; wizard still uses `CapabilityFilterPicker` |
| Prices | Limit `saveLive` leaves Professional monthly amount |
| Checkout / billing | No checkout, invoice, payment, or renewal files in this diff |
| Owner Access Mode | No `platform_owner_access_mode` change; owner suites pass |
| Frozen lifecycle | Frozen prefixes and account-state tests unchanged |
| QR | No QR files touched |

## Pre-existing failures (not introduced by Limits)

| Suite | Why it is not this program |
|-------|----------------------------|
| `server/routers.test.ts` many `verifiedProcedure` mutations | `assertCommercialAccountActive` fail-closed when the incomplete `./db` mock cannot resolve hub state (`غير مصرح بالوصول`). Frozen program residual; fails **before** `assertRestaurantCreateAllowed`. |
| `server/restaurant-profile-verification.test.ts` create/update | Same Frozen / hub mock gap. The “admin bypass” case is **email-verification** bypass, not quota. |

These suites were not part of the Limits repair change set except that `restaurant.create` now always calls quota **after** the Frozen gate. The observed failures are the Frozen gate, not quota.

## Typecheck / build

| Gate | Result |
|------|--------|
| `pnpm build` | **PASS** (vite + server esbuild) |
| `pnpm check` | **184** baseline `error TS*`. No new errors in Limits repair files. |
