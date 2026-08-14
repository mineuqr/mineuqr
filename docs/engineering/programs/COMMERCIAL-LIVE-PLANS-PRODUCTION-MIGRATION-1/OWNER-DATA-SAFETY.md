# OWNER-DATA-SAFETY.md

Owner `600001` was not part of this migration. No renew, expire, create, delete, entitlement bind, or commercial-plan bind was performed.

P0 expired access remains: `OWNER-SUBSCRIPTION-ACCESS-FORENSICS-1`.

## Owner subscription fingerprint (pre = post)

| Field | Value |
|-------|--------|
| id | 600001 |
| userId | 1 |
| restaurantId | 0 |
| planId | 30002 |
| status | active |
| billingCycle | monthly |
| currentPeriodStart | 2026-06-08T03:08:15.000Z |
| currentPeriodEnd | **2026-08-07T21:00:00.000Z** |
| trialEndsAt | null |
| canceledAt | null |
| createdAt | 2026-06-08T03:08:15.000Z |
| updatedAt | **2026-06-09T18:28:40.000Z** |

`updatedAt` unchanged proves no write.

## Owner identity

| Field | Value |
|-------|--------|
| users.id | 1 |
| name | Khaled Sh |
| email | k.sh61@yahoo.com |
| role | admin |
| openId | `j4Ztx2Wi3et3TD5zYNG5fy` |

Restaurants owned by user 1 (unchanged count 2 in this query): `720007` (khaled), `870001`.

Commercial bindings for owner: **none** (table still 0 rows).

## Orphan Tap payment `60001` (must remain untouched)

| Field | Value |
|-------|--------|
| id | 60001 |
| userId | 2700049 (user absent) |
| subscriptionId | null |
| invoiceId | null |
| amount | **349.00** |
| currency | **SAR** |
| status | **captured** |
| paidAt | 2026-05-19T09:39:13.000Z |
| createdAt | 2026-05-19T09:39:09.000Z |
| updatedAt | 2026-05-19T09:39:12.000Z |

Pre-migration snapshot matched post-bootstrap snapshot field-for-field.
