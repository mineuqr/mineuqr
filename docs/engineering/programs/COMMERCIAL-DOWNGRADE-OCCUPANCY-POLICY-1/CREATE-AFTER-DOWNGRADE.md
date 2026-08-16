# CREATE AFTER DOWNGRADE

**Program:** COMMERCIAL-DOWNGRADE-OCCUPANCY-POLICY-1  

## Invariant

```
proposedTotal = COUNT(*) + 1
if proposedTotal > effectiveCap → CommercialLimitExceededError
no domain mutation
```

No bypass by owner, admin, PLATFORM_OWNER role, POS, or internal service. PLATFORM_OWNER still uses the target tenant cap (G-09 B) unless that tenant’s entitlement is unlimited.

## TiDB evidence (G-11)

Seed occupancy 2 at cap 2, then create at cap 1:

| Result | Value |
|--------|-------|
| occupancy after | 2 |
| new cap | 1 |
| create | rejected |
| existing rows | remain |

Delete until occupancy 1, cap 1: create still rejected (`1 + 1 > 1`).  
Delete until occupancy 0, cap 1: create allowed.

## Multi-resource

Item cap downgrade rejected an item create while restaurant occupancy stayed 1. Keys are independent.

## Owner / admin

Two concurrent category creates after a 2 → 1 downgrade: both rejected, occupancy stayed 2.

## What create is not

Create-after-downgrade is not expiration, not a freeze, and not permission to hide existing rows so the new create can succeed.
