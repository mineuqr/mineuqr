# DATA MODEL

Table: `commercial_subscription_concessions`

The concession is the entity. History is versioned rows. `user_subscriptions` is not a concession ledger.

## Columns

| Column | Type | Role |
|--------|------|------|
| `id` | varchar(36) PK | Concession version id |
| `subscriptionId` | int NOT NULL | Owner subscription |
| `planId` | varchar(36) NOT NULL | Live Plan UUID at grant/revise (audit fact, not price authority) |
| `billingCycleCode` | varchar(64) NOT NULL | Selected cycle at grant/revise |
| `unit` | varchar(16) NOT NULL | `day` or `month` |
| `duration` | int NOT NULL | Positive integer in `unit` |
| `startsAt` | timestamp NOT NULL | Immediate grant/revise commit time |
| `endsAt` | timestamp NOT NULL | Computed calendar end |
| `status` | varchar(16) NOT NULL | `active` \| `superseded` \| `expired` \| `cancelled` |
| `version` | int NOT NULL | Per-subscription monotonic version |
| `source` | varchar(32) NOT NULL | `admin_grant` \| `admin_revise` \| `admin_cancel` |
| `actorId` | int NULL | Admin actor |
| `reason` | varchar(512) NOT NULL | Required note |
| `supersededBy` | varchar(36) NULL | Next version id |
| `cancelledAt` | timestamp NULL | Cancel timestamp |
| `createdAt` | timestamp NOT NULL | Insert time |

## Constraints

- UNIQUE `(subscriptionId, version)` — one version number per subscription
- INDEX `(subscriptionId, status, endsAt)` — current-row lookup

## Current concession

A row is current only when:

```
status = "active" AND now < endsAt
```

Expiration is time-derived. A physical `expired` write is not required for reads.

## What this table is not

- Not Charged Terms
- Not Binding leftover
- Not `subscription_plans`
- Not trial policy
- Not POS complimentary
