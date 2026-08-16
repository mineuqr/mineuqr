# TEST RESULTS

**Code change:** none. **New tests:** 0. **Live TiDB occupancy drill:** not run (no implementation; Production mutation 0).

## Combined regression

Same suite as POS-COMMERCIAL-ENTITLEMENT-VERIFICATION-1:

`pnpm exec vitest run` POS + subscription-runtime + plan limits + commercial gating/limits + shared/pos + IdentityPlaceOrder + SettleOrderPaid + StaffCounterPickup + CRMP + Check settlement + reporting parity

**53 files passed / 0 failed**  
**359 tests passed / 0 failed**

Includes existing `checkLimit` unit behavior (`posCommercial.integration`, `subscriptionPlanLimits`, entitlement enforcement) — **not** engine occupancy.

## Build / check

- `pnpm build` — **PASS**  
- `pnpm check` — **188** preexisting `error TS*` — unchanged vs POS-COMMERCIAL-ENTITLEMENT-VERIFICATION-1
