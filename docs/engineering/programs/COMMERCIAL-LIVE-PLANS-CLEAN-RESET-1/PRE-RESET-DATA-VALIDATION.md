# PRE-RESET-DATA-VALIDATION.md

**Queried:** 2026-08-14T21:13:14Z  
**Database:** `mineuqr` (TiDB Cloud)  
**Method:** SELECT only (`_preflight.mjs` → `_PREFLIGHT.json`)  
**Result:** **PASS** — no STOP condition.

---

| Check | Result |
|-------|--------|
| `commercial_subscription_bindings` | **0** |
| `commercial_snapshot_definitions` | **0** |
| `user_subscriptions.planId` | `30002`, `30003` only (legacy ints) |
| Invoice columns referencing catalog | **none** |
| Payment columns referencing catalog | **none** |
| Restaurant columns referencing catalog | **none** |
| `user_subscriptions` catalog UUID / version / snapshot columns | **none** |
| Live plan columns already on `commercial_plans` | **absent** (0086 not applied) |
| DB terminus | **0085** (`c104e894606f…`, id 5994103) |

Owner `600001` at preflight (must not be written by this program):

| Field | Value |
|-------|--------|
| userId | 1 |
| restaurantId | 0 |
| planId | 30002 |
| status | active |
| currentPeriodEnd | 2026-08-07T21:00:00Z |
| updatedAt | 2026-06-09T18:28:40Z |

Orphan Tap payment `60001`: 349.00 SAR, captured, paidAt 2026-05-19T09:39:13Z — **untouched**.
