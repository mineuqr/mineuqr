# REGRESSION-VALIDATION.md

Production data was not modified. No migration was applied.

## Frozen suites (this program)

| Suite | Result |
|-------|--------|
| `commercialAccountState.test.ts` (derive) | **6 passed** |
| `assertCommercialAccountActive.test.ts` | **5 passed** |
| `commercialAccountState.test.ts` (client redirect) | **5 passed** |
| `qrOrderingFrozen.behavior.test.ts` | **2 passed** |
| `commercialFrozenAccountState.guards.test.ts` | **4 passed** |
| `subscriptionRuntimeEntitlement.enforcement.test.ts` | **14 passed** (includes paid/trial/renewal stamps) |
| `platformOwnerAccess.hub.test.ts` | **3 passed** (FULL_PLATFORM + SIMULATED_PLAN ACTIVE) |
| `orderingClientRuntime.test.ts` | **4 passed** |

**8 files, 43 passed.**

## Commercial / owner / trial / QR / auth regression

| Suite | Result |
|-------|--------|
| Trial (`create-trial-subscription`, `trial-and-webhook`) | **pass** |
| Subscription resolver / activation / entitlement | **pass** |
| Entitlement hub + governance guards | **pass** |
| Device capability matrix | **12 passed** |
| Owner access (identity, entitlements, service, cache, router, UI) | **pass** |
| Guest ordering + QR migration / consumer | **pass** |
| Auth register / logout | **pass** |
| Wave1 read + client entitlements hooks | **pass** |

## Pre-existing failures (not introduced by Frozen)

| Suite | Why it is not this program |
|-------|----------------------------|
| `server/subscription.test.ts` `listPlans` / `checkTrialStatus` | Incomplete `./db` mock (`getDb`) on catalog hydrate / live-plan load. Path existed before Frozen stamping. |
| `resolveCommercialEntitlements.test.ts` BASIC ordering / ENTERPRISE vs Professional | Legacy matrix vs current Live Plan projections. This program did not change `planFeatureMatrix` or Live Plans. |

## Build / typecheck

| Gate | Result |
|------|--------|
| `pnpm build` | **pass** |
| `pnpm check` | Baseline failures remain (~184). **No errors in Frozen files after the TRPC `cause` typing fix.** Pre-existing Dashboard / MenuView / App / catalog errors unchanged. |
