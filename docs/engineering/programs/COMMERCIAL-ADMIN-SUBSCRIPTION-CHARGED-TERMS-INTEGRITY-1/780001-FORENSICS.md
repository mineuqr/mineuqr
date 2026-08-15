# 780001 FORENSICS

**Query:** `_QUERY-EVIDENCE.json`  
**queriedAt:** `2026-08-15T15:17:10.073Z`  
**access:** PRODUCTION  
**mutation:** NONE  

This row is INTERNAL/test. It remains valid evidence of Admin Subscription Management. No Production mutation was performed.

## Row

| Field | Value |
|-------|--------|
| id | 780001 |
| userId | 21630002 |
| restaurantId | 0 (account-level) |
| restaurants for user | 1 |
| role | admin |
| accountClassification | INTERNAL |
| status | active |
| plan UUID | `d836bd10-9d9f-4408-a076-f921354d785a` |
| Live Plan code | enterprise |
| billingCycle | **yearly** |
| currentPeriodStart | 2026-06-21T10:47:36.000Z |
| currentPeriodEnd | 2027-06-21T10:47:36.000Z |
| trialEndsAt / canceledAt | null |
| stripe ids | null |
| createdAt | 2026-06-21T10:47:35.000Z |
| updatedAt | 2026-08-15T09:37:49.000Z (same timestamp on all six subscription rows; identity migration, not Admin update) |
| amount on subscription | **none** — no amount columns on the table |
| Binding | **none** |
| Charged Terms | **none** |

## Admin operation evidence

Audit event **4950004**:

- `eventType`: `subscription_created_by_admin`
- `occurredAt`: 2026-06-21T10:47:36.000Z
- `actorId`: 21630002 (self-create)
- `actorRole`: admin
- `procedure`: `admin.createUserSubscriptionByAdmin`
- `after.plan`: **30003** (leftover integer enterprise identity at create time; later migrated to Live Plan UUID)
- `after.status`: active
- `after.startDate`: 2026-06-21T13:47:35.663Z
- `after.expiration`: 2027-06-21T13:47:35.663Z
- **No amount. No currency. No billingCycle in audit payload.**

Period start → end is exactly +1 year to the millisecond in the audit snapshot. That matches `computeAdminSubscriptionPeriodEnd` for `billingCycle === "yearly"` with **empty** `subscriptionEndDate` (server default), not a date-only Admin input (which would store midnight).

No `subscription_updated_by_admin` for 780001.

## False-positive audits

Events 20070009 / 20070010: `cascade_restaurant_deleted`, `targetType = restaurant`, `targetId = 780001`, `metadata.restaurantId = 780001`, actor 14760004. These are a **restaurant id collision**, not operations on subscription 780001.

## Why no Binding / Charged Terms

1. Created 2026-06-21 via Admin create.
2. `commercial_subscription_bindings` did not exist until `0085` (2026-07-29).
3. Admin create did not call `ensureLivePlanBoundForSubscription` until `fe209565` (2026-08-15 01:10:41 +0300).
4. No later Admin update re-bind trigger fired on this row.
5. This program did not create a Binding.

## Is the UI $99/month persisted?

**No.** It is not on the subscription row, not in the create audit, and not on a Binding.

Persisted commercial facts for 780001: Live Plan enterprise (via migrated UUID), **yearly** cycle, active, period 2026-06-21 → 2027-06-21.

Today's enterprise catalog (SELECT, not historical proof): monthly **99.00 USD** global, yearly **999.00 USD** global. Using either figure as 780001 Charged Terms would be retrospective invention.

## Recoverable original financial terms?

| Candidate | Recoverable? |
|-----------|----------------|
| Plan identity | Yes: leftover 30003 → enterprise UUID |
| Status | Yes: active |
| Period | Yes: +1 year from create instant |
| Billing cycle | Yes, on the row: yearly |
| Charged amount | **No** |
| Charged currency | **No** (not stored; catalog today is USD global / SAR regional — not a 2026-06-21 freeze) |
| Bind event | **No** — never bound |

**Classification:** financially incomplete. Leave unchanged. Do not fabricate Charged Terms from today's Live Plan price.

780001 is also **INTERNAL**, so it is outside the certified commercial KPI population even if Charged Terms existed.
