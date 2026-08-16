# LOCK-ROW DESIGN

## Table

`commercial_limit_occupancy_locks`

| Column | Role |
|--------|------|
| `scopeKind` | `owner` or `restaurant` |
| `scopeId` | owner user id or restaurant id |
| `limitKey` | commercial quantity key |
| `createdAt` | insert timestamp only |

Primary key: `(scopeKind, scopeId, limitKey)`.

## What the row is

A **stable lock token**. It is not occupancy, not a cap, not a subscription, not a resource.

There is no `occupied` / `count` column. Occupancy remains domain `COUNT(*)`.

## Acquisition

Inside the same Drizzle transaction:

1. `INSERT … ON DUPLICATE KEY UPDATE limitKey = limitKey` (create-if-absent, no counter bump).  
2. `SELECT scopeKind … FOR UPDATE` on that exact PK.

First concurrent inserter wins the row; the other hits duplicate key then waits on `FOR UPDATE`.

## Ownership / isolation

| Resource | scopeKind | scopeId |
|----------|-----------|---------|
| restaurants | `owner` | `ownerUserId` |
| categories, items, posTerminals | `restaurant` | `restaurantId` |

Restaurant A’s `posTerminals` lock does not block restaurant B.  
Owner 1’s `restaurants` lock does not block owner 2.  
Same restaurant `categories` vs `items` use different PKs and do not block each other.

## Forbidden lock targets (not used)

- `commercial_limit_values` (plan-wide contention)  
- Live Plan rows  
- One global row  
- POS-named lock tables  
- `GET_LOCK()`
