# PRE-APPLY PREFLIGHT

**Mode:** SELECT / INFORMATION_SCHEMA only. Mutation: NONE.  
**Evidence:** `_PRE-APPLY.json`  
**Queried at:** `2026-08-15T21:17:51.128Z`  
**Access:** PRODUCTION (`tidbcloud_prod`, TLS, port 4000)

## Target

| Check | Result |
|-------|--------|
| `DATABASE()` | `mineuqr` |
| Host shape | TiDB Cloud prod gateway01 |
| Journal terminus | 0089 `45dd198fe62f78746ef245e5091fc146ee383235f6d5a01b5d2b590b06c37e6d` (id 6114102) |
| `count_hash_0089` | 1 |
| `count_hash_0090` | **0** |
| Concession table | **ABSENT** |
| Snapshot table | present, rows 0 |

## Baseline counts

| Table | Count |
|-------|------:|
| user_subscriptions | 7 |
| commercial_subscription_bindings | 3 |
| commercial_subscription_charged_terms | 0 |
| commercial_plans | 3 |
| commercial_prices | 10 |

## 780001

| Field | Value |
|-------|--------|
| status | active |
| billingCycle | yearly |
| planId | `d836bd10-9d9f-4408-a076-f921354d785a` |
| currentPeriodEnd | `2027-06-21T10:47:36.000Z` |
| binding | **absent** |

Not modified. No historical financial inference.

## Gate

0090 was not already applied. Preflight **PASS**.
