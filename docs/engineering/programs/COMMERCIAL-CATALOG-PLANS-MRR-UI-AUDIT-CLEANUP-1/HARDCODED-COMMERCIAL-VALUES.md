# HARDCODED-COMMERCIAL-VALUES.md

Do not treat every numeric hit as a violation.

| Value | Where | Class |
|-------|-------|-------|
| 19 / 39 / 99 USD monthly | Production `subscription_plans` (docs + checkout) | **LEGACY_COMPATIBILITY** charge book |
| 19 / 175, 35 / 299, 59 / 499 | `server/seed-plans.mjs` | **OBSOLETE** / dangerous emergency script (do not run) |
| 19.00 / 199.00 Basic catalog | Production catalog drift | **PERSISTED** (not a code rule) |
| 26.40 / 264.00, 79.73 / 797.33 | `legacyPlanCommercialTerms.ts` bootstrap | **TEST FIXTURE** / bootstrap seed — not runtime quota |
| 99 / 299 SAR | Same bootstrap + production catalog | **PERSISTED** / seed |
| restaurants 1 / 5 / null | Production `commercial_limit_values` + bootstrap `PLAN_LIMITS` | **PERSISTED** current values; `PLAN_LIMITS` is **LEGACY_COMPATIBILITY** / seed |
| 999 / 9999 | `seed-plans.mjs` maxRestaurants / items | **OBSOLETE** fake unlimited |
| 14 | Trial policy / constitution | **CANONICAL** trial duration unless product changes it |
| Basic / Professional / Enterprise | Bridge codes, i18n, tests | **CANONICAL** names / **TEST FIXTURE** / **DOCUMENTATION** |
| `if (plan === "basic")` quota | Removed from restaurant create (LIMITS-REPAIR-1) | Must not return as **HARDCODED_BUSINESS_RULE** |

Runtime restaurant quota must not hardcode 1 / 5 / Unlimited. Current values live in the catalog.
