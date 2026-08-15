# LIMIT-TEST-MATRIX.md

| # | Case | Evidence | Result |
|---|------|----------|--------|
| 1 | Loads current restaurant limit | `livePlanLimitsEditor.test.ts`; wizard hydrates `limitsFromProfileValues` | PASS |
| 2 | Loads Unlimited (`null`) | Editor test + Enterprise bootstrap `null` | PASS |
| 3 | Changes Limited value | `saveLive` Professional `5 → 10` | PASS |
| 4 | Limited → Unlimited | Enterprise `null → 50` then back; first step is Limited | PASS |
| 5 | Unlimited → Limited | Enterprise `null → 50` | PASS |
| 6 | Invalid value rejected | `-4` / `1.5` / missing keys | PASS |
| 7 | Failed save rolls back | Invalid limits; capability failure; empty prices | PASS |
| 8 | Successful save persists | Professional `10` hydrated | PASS |
| 9 | Plan + prices + capabilities + limits atomic | Shared snapshot/restore in `saveLive` | PASS |
| 10 | Limit failure rolls back entire save | Invalid limits; prior values remain | PASS |
| 11 | Capability failure rolls back limits | Unknown feature key + limits `99` | PASS |
| 12 | Price failure rolls back limits | `prices: []` fails validator; limit + price restored | PASS |
| 13 | Runtime reads Live Plan restaurant limit | `resolvePlanLimitsForUser` → hub `limits.restaurants` | PASS |
| 14 | Runtime does not use `PLAN_LIMITS` | `subscriptionPlanLimits.ts` source + unit test | PASS |
| 15 | Runtime does not use `subscription_plans.maxRestaurants` | Adapter no longer queries plans | PASS |
| 16 | Runtime does not use hardcoded plan-name values | No Basic/Pro/Enterprise constants in adapter | PASS |
| 17 | Basic cap 1: 0 allowed, 1 denied | `assertRestaurantCreateAllowed` + `checkLimit` mocks | PASS |
| 18 | Professional cap 5: 0–4 allowed, 5 denied | Same | PASS |
| 19 | Enterprise Unlimited: no numeric denial | Hub `null` → `unlimited` | PASS |
| 20 | Customer admin does not bypass | `routers.ts` always calls assert; guard test | PASS |
| 21 | FULL_PLATFORM Unlimited | `platformOwnerAccess.entitlements.test.ts` | PASS |
| 22 | SIMULATED_BASIC uses Basic current limit | Same suite (`restaurants === 1` from composition) | PASS |
| 23 | SIMULATED_PROFESSIONAL uses Professional current | Same (`5` from composition) | PASS |
| 24 | SIMULATED_ENTERPRISE Unlimited | Composition `null` + FULL_PLATFORM `null` | PASS |
| 25 | FROZEN denies restaurant.create | `FROZEN_BLOCKED_MUTATION_PREFIXES` + Frozen suites | PASS |
| 26 | Professional `5 → 10` | `saveLive` persist test | PASS |
| 27 | Runtime sees 10 after cache invalidation | Entitlement cache cleared after save | PASS |
| 28 | Sixth allowed at cap 10 | `checkLimit` `proposedTotal <= cap` | PASS |
| 29 | Eleventh denied at cap 10 | Same | PASS |
| 30 | Enterprise Unlimited → 50 | `saveLive` | PASS |
| 31 | 51st denied at 50 | `checkLimit` hard cap | PASS |
| 32 | 50 → Unlimited | `saveLive` back to `null` | PASS |
| 33 | Previously denied create allowed | `null` → `unlimited` | PASS |
| 34 | Capabilities unchanged | Capability editor repair suite still passes | PASS |
| 35 | Prices unchanged | Limit save leaves monthly amount | PASS |
| 36 | Checkout unchanged | No checkout/billing files in this program | PASS |
| 37 | Owner Access Mode unchanged | Owner suites pass; no mode schema change | PASS |
| 38 | Frozen lifecycle unchanged | Frozen suites pass | PASS |
| 39 | QR behavior unchanged | No QR files touched | PASS |
| 40 | Billing unchanged | No invoice/payment/renewal files touched | PASS |

Primary suites:

- `server/commercial-catalog/__tests__/commercialLivePlans.limits.repair.test.ts`
- `server/subscriptionPlanLimits.test.ts`
- `client/.../livePlanLimitsEditor.test.ts`
- `server/platform-owner-access/__tests__/platformOwnerAccess.entitlements.test.ts`
- `server/commercial/__tests__/assertCommercialAccountActive.test.ts`
- `server/commercial-catalog/__tests__/commercialLivePlans.capabilityEditor.repair.test.ts`
