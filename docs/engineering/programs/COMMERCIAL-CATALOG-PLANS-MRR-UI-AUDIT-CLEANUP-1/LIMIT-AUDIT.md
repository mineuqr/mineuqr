# LIMIT-AUDIT.md

Canonical Live Plan limit keys (`LIVE_PLAN_LIMIT_KEYS`):

`restaurants` · `categories` · `items`

Unlimited = `null`. Persistence: `commercial_limit_values`. Editor: `LivePlanLimitsEditor`. Runtime: `checkLimit` → `assertRestaurantCreateAllowed` / category / item.

## Current production values (not code rules)

| Key | Basic | Professional | Enterprise |
|-----|------:|-------------:|------------|
| restaurants | 1 | 5 | `null` |
| categories | 10 | 25 | `null` |
| items | 100 | 500 | `null` |

Changing a Live Plan limit in the editor + `saveLive` does **not** require a code change. Cache invalidation is required (already implemented).

## Vocabulary-only keys (not Live Plan inventory)

`COMMERCIAL_LIMIT_FILTER_KEYS` also lists: `ordersPerMonth`, `qrCodes`, `storage`, `images`, `staffAccounts`, `branches`, `devices`.

These have i18n labels. They are **not** in `LIVE_PLAN_LIMIT_KEYS`, **not** edited, **not** in `readLimitValue`. Class: **ORPHANED** at runtime. Do not invent enforcement in this program.

## Isolated legacy

`PLAN_LIMITS` and `subscription_plans.maxRestaurants` remain for Legacy Bridge / checkout DTO. They must not override bound Live Plan quota (LIMITS-REPAIR-1).
