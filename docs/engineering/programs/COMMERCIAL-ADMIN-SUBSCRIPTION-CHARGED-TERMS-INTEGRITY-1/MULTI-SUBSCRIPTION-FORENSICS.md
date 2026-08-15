# MULTI-SUBSCRIPTION FORENSICS

Multiple `user_subscriptions` rows were **not** treated as multiple restaurants. Production restaurant-scoped rows (`restaurantId > 0`): **0**.

## Accounts

| userId | classification | restaurant_n | subscription rows | Canonical pick (`pickUserLevelSubscription`) |
|--------|----------------|--------------|-------------------|-----------------------------------------------|
| 1 | INTERNAL | 2 | 1 (600001) | 600001 (only row; rank 1 — active but period elapsed) |
| 21630002 | INTERNAL | 1 | 1 (780001) | 780001 (rank 0 — active, period through 2027-06-21) |
| 14760004 | COMMERCIAL | **1** | **4** | **840001** (rank 0 entitled; others rank 1 or 2) |

User 14760004: 1 restaurant, 4 **account-level** rows. Duplicates are not multi-restaurant.

## User 14760004 cluster

| id | created | status | entitled now? | overlap | binding |
|----|---------|--------|---------------|---------|---------|
| 690001 | 2026-06-09 | active, period ended 2026-06-13 | no | superseded in time | none |
| 750001 | 2026-06-16 | active, period ended 2026-07-16 | no | created after 690001 elapsed; status left `active` | none |
| 810001 | 2026-08-15T00:01Z | expired by Admin at 00:24Z | no | created while prior rows still `active` but not entitled | 19.00 monthly |
| 840001 | 2026-08-15T00:26Z | active, period current | yes | replacement after 810001 expired | 99.00 monthly |

Temporal overlap of **status=active** flags: 690001, 750001, and 840001 can all show `active` while only 840001 is entitled. Duplicate **active commitment** in the financial sense: only 840001 has current entitlement + Charged Terms.

No two rows share a Binding (`subscriptionId` unique). Duplicate plan: 690001 and 750001 are both professional monthly with no CT.

## Why extra rows exist (proven mechanism)

`applyAdminUserSubscriptionCreate` rejects create only when `ownerHasEntitledAccountSubscription` is true. Elapsed `active` rows are not entitled, so Admin create inserts a **new** row instead of updating the old one. 810001 was explicitly expired so 840001 could be created (audit 19890002 then 19890004, two minutes apart).

## Nature of the multiples

| Cluster | Verdict |
|---------|---------|
| 690001 | Historical / shortened by Admin update; origin of create unproven |
| 750001 | Historical Admin create; leftover `active` status |
| 810001 | Replacement attempt then Admin-expired; has CT |
| 840001 | Current canonical row; Admin create after cutover |

Not cleanup in this program. Not assumed to be four restaurants.
