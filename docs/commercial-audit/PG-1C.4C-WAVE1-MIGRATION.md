# PG-1C.4C — Wave 1 SAFE Server Enforcement Migration

**Program:** Commercial Governance (PG-1C)  
**Task:** PG-1C.4C — execute approved Wave 1 SAFE server authority consolidation  
**Branch:** `pg-1c-4c-wave1`  
**Date:** 2026-06-07  
**Mode:** Read-path authority consolidation — no mutation enforcement changes  

**References:**

- `PG-1C.4A-SERVER-GATE-DISCOVERY.md`
- `PG-1C.4B-SERVER-GATE-MIGRATION-MATRIX.md`

---

## 1. Wave 1 execution inventory (pre-migration)

| Gate ID | Router | Procedure / Function | Risk | Current pattern | Target pattern | Action |
|---|---|---|---|---|---|---|
| S-12 | *(helper)* | `pickUserLevelSubscription` | SAFE | Account-level row pick | Same | **No change** (PG-1C.2E) |
| S-13 | *(helper)* | `buildCommercialContextFromDb` | SAFE | Context adapter | `CommercialContext` | **No change** (PG-1C.2E) |
| S-14 | *(helper)* | `getCommercialEntitlements` | SAFE | Resolver read | `CommercialEntitlements` | **No change** (PG-1C.2E) |
| S-27 | `commercial` | `getEntitlements` | SAFE | Canonical read | Same | **No change** (PG-1C.2E) |
| S-54 | *(helper)* | `buildCommercialContextFromDb` admin | SAFE | ADMIN plan | `commercial.isAdmin` | **No change** |
| S-06 | *(helper)* | `getTrialEndDate` | SAFE | Trial date read | `context.subscription.trialEndsAt` + fallback | **Shimmed** via S-23 |
| S-23 | `subscription` | `checkTrialStatus` | SAFE | `isSubscriptionActive` + `getTrialEndDate` | `getCommercialEntitlements` + parity fallback | **Migrated** |
| S-21 | `order` | `canOrder` | SAFE | `restaurantAllowsTableOrdering` | `features.ordering` + parity fallback | **Migrated** |
| F-01 | `restaurant` | `stats` | SAFE | None (optional) | `features.reports` | **Excluded** — would deny BASIC; behavior change |

**Explicitly excluded (not Wave 1):** S-22 `order.create`, all Wave 2–4 gates, billing, trial lifecycle, MRR.

---

## 2. Files modified

| File | Change |
|---|---|
| `server/commercial/wave1ReadAuthority.ts` | **New** — Wave 1 read authority helpers |
| `server/commercial/wave1ReadAuthority.test.ts` | **New** — parity unit tests (8 cases) |
| `server/routers.ts` | Wire `checkTrialStatus` and `canOrder` to Wave 1 helpers |
| `server/subscription.test.ts` | Extend `db` mock for entitlements read path |
| `server/subscription-invoice-verification.test.ts` | Extend `db` mock for entitlements read path |
| `docs/commercial-audit/PG-1C.4C-WAVE1-MIGRATION.md` | This document |

**Not modified:** `resolveCommercialEntitlements`, `buildCommercialContextFromDb`, billing, webhooks, trial creation, mutation gates, database schema.

---

## 3. Before / after enforcement

### S-23 — `subscription.checkTrialStatus`

| Field | Before | After |
|---|---|---|
| Authority | `isSubscriptionActive()` + `getTrialEndDate()` direct | `getCommercialEntitlements()` → `resolveTrialStatusRead()` |
| `isActive` | Any entitled row (`userHasSubscriptionEntitlement`) | `plan !== "NONE"` → true; else legacy `isSubscriptionActive` |
| `trialEndDate` | Canonical trial row `trialEndsAt` | `context.subscription.trialEndsAt` if present; else `getTrialEndDate` |
| Response shape | `{ isActive, trialEndDate }` | **Unchanged** |

### S-21 — `order.canOrder`

| Field | Before | After |
|---|---|---|
| Authority | `restaurantAllowsTableOrdering()` | `getCommercialEntitlements(ownerId)` → `resolveCanOrderRead()` |
| `canOrder` | Restaurant-scoped sub + `planId !== 30001` | If owner `plan === "NONE"`: legacy only; else `legacy \|\| features.ordering` |
| Response shape | `{ canOrder }` | **Unchanged** |

### Parity rationale

Self-service register creates **restaurant-scoped** trial rows (`restaurantId > 0`). Account-level `getCommercialEntitlements` returns `plan: NONE` until an account-level row exists. Wave 1 helpers **fall back to legacy** in that case so register-path users retain `isActive: true` and guest ordering probes stay correct.

---

## 4. Validation performed

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ Pass |
| `npx vitest run server/commercial src/lib/commercial` | ✅ 90/90 pass |
| Wave 1 unit tests | ✅ 8/8 (`wave1ReadAuthority.test.ts`) |
| Resolver tests | ✅ 34/34 unchanged |
| Entitlements integration tests | ✅ 5/5 unchanged |

| `server/subscription.test.ts` | ✅ Pass (mock extended for `getUserById` / `getSubscriptionsByUser`) |
| `server/subscription-invoice-verification.test.ts` | ✅ Pass |
| `server/routers.test.ts` | ✅ 69/69 pass |

### Entitlement regression

- No changes to `resolveCommercialEntitlements`, `planFeatureMatrix`, or `CommercialContext` builder.
- Mutation paths (`updateTemplate`, `updateCustomColors`, `order.create`) unchanged.

### Client/server drift

- Client already uses `commercial.getEntitlements` / `useCommercialFeatureVisibility`.
- `checkTrialStatus` legacy endpoint still returns same shape; client primarily uses entitlements hook (PG-1C.3B).
- `order.canOrder` parity preserved for restaurant-scoped subscription edge case.

---

## 5. Issues discovered

| ID | Issue | Resolution |
|---|---|---|
| I-1 | Register path uses restaurant-scoped trial; account-level entitlements return NONE | Parity fallback to legacy helpers when `plan === "NONE"` |
| I-2 | Ordering scope differs (restaurant row vs account row) per PG-1C.4B Q-2 | Wave 1 combines legacy + entitlements when plan ≠ NONE; full normalization deferred to Wave 2 |
| I-3 | F-01 `restaurant.stats` reports gate would deny BASIC | Excluded from Wave 1 — would change behavior |

---

## 6. Rollback notes

| Approach | Steps |
|---|---|
| **Git revert** | Revert commit on `pg-1c-4c-wave1`; restore direct `isSubscriptionActive` / `restaurantAllowsTableOrdering` in `routers.ts` |
| **Partial rollback** | Delete `wave1ReadAuthority.ts` and inline legacy calls in two procedures |
| **Risk** | Low — read-only endpoints; no billing or mutation paths touched |

---

## 7. Risk assessment

| Risk | Level | Mitigation |
|---|---|---|
| `checkTrialStatus` regression for register users | Low | Parity fallback + unit tests |
| `canOrder` false negative for restaurant-scoped PRO | Low | Legacy path when plan NONE; OR logic when plan set |
| `canOrder` false positive | Low | Same formula preserves legacy true cases |
| Accidental Wave 2 scope creep | None | `order.create` untouched |
| Billing / trial impact | None | No billing files modified |

**Overall:** Low risk — read-path consolidation only.

---

## 8. Wave 1 completion checklist

| Criterion | Status |
|---|---|
| Only Wave 1 gates migrated | ✅ |
| Behavior preserved (parity fallbacks) | ✅ |
| CommercialContext authority path used | ✅ |
| No plan-specific logic in routers | ✅ |
| No new entitlement sources | ✅ |
| No billing/trial/MRR changes | ✅ |
| Documentation complete | ✅ |
| Tests added | ✅ |

**Next:** PG-1C.4D — Wave 2 feature write enforcement (pending approval).
