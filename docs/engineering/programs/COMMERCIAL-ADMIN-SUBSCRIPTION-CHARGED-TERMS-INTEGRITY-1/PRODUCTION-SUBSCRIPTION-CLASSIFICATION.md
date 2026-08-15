# PRODUCTION SUBSCRIPTION CLASSIFICATION

**SELECT:** 2026-08-15T15:17:10.073Z PRODUCTION `mineuqr`. Mutation: NONE.  
Do not reuse older counts. Current population: **6** `user_subscriptions` rows. All `restaurantId = 0`.

Classification uses operational evidence (audit, dates, binding, entitlement, `accountClassification`), not user identity alone.

Legend: **A** commercial customer operationally entitled · **B** internal/test · **C** historical · **D** duplicate/ambiguous · **E** other/unproven origin.

## Inventory

| id | userId | class / role | restaurants | plan | status | cycle | period end | binding / CT | Admin evidence | Labels |
|----|--------|--------------|-------------|------|--------|-------|------------|--------------|----------------|--------|
| 600001 | 1 | INTERNAL / admin | 2 | professional | active (period elapsed 2026-08-07) | monthly | 2026-08-07T21:00:00Z | none | no create/update-by-admin in current audit set | **B + C + E** |
| 690001 | 14760004 | COMMERCIAL / user | 1 | professional | active (elapsed 2026-06-13) | monthly | 2026-06-13T21:00:00Z | none | update-by-admin 2026-06-13 (expiration shortened); no create-by-admin | **D + C** |
| 750001 | 14760004 | COMMERCIAL / user | 1 | professional | active (elapsed 2026-07-16) | monthly | 2026-07-16T21:00:00Z | none | create-by-admin 2026-06-16 plan 30002 | **D + C** (Admin-created, no CT) |
| 810001 | 14760004 | COMMERCIAL / user | 1 | basic | expired | monthly | 2026-09-14T21:00:00Z | 19.00 USD monthly | create-by-admin 2026-08-15 plan 30001; update-by-admin 00:24Z → expired | **D + C** (replaced) |
| 840001 | 14760004 | COMMERCIAL / user | 1 | enterprise | active (period current) | monthly | 2026-09-15T00:26:46Z | 99.00 USD monthly | create-by-admin 2026-08-15 plan 30003 | **A + D** |
| 780001 | 21630002 | INTERNAL / admin | 1 | enterprise | active (period current through 2027-06-21) | yearly | 2027-06-21T10:47:36Z | none | create-by-admin 2026-06-21 plan 30003 | **B** (Admin-flow evidence) |

## Notes

- **A** on 840001 means: COMMERCIAL classification, currently entitled, has Charged Terms, one restaurant. Same-day expire-then-create after 810001 is also **D** (Admin churn on that account). Not proven as an external paying customer versus an Admin exercise of a COMMERCIAL-classified account.
- 600001 has no Admin create audit in this SELECT. Origin unproven (**E**). INTERNAL + elapsed period.
- All six rows share `updatedAt = 2026-08-15T09:37:49Z` (plan UUID migration).
- Restaurant-scoped `user_subscriptions`: **0**.

## Admin-created subset

Proven `admin.createUserSubscriptionByAdmin`: **750001, 780001, 810001, 840001**.

Of those, Charged Terms exist only on **810001** and **840001** (created after bind-on-create cutover).
