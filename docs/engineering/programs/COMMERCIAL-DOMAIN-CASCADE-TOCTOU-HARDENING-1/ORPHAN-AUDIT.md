# ORPHAN AUDIT

**Program:** COMMERCIAL-DOMAIN-CASCADE-TOCTOU-HARDENING-1  
**Scope:** read-only census on `mineuqr-stagIn` via G07_DATABASE_URL  
**Date:** 2026-08-17  
**Mutation of historical rows:** none  

## Engine / identity

`VERSION()` = 8.0.11-TiDB-v8.5.3-serverless  
`DATABASE()` = mineuqr  
`CURRENT_USER()` = `3BUSFE99csVhDLu.root@%`

## Foreign keys to `restaurants`

`information_schema.KEY_COLUMN_USAGE` where `REFERENCED_TABLE_NAME = 'restaurants'`: **0**

## LEFT JOIN census (child rows whose restaurant id is absent)

| Table | Present on stagIn | Orphans |
|-------|-------------------|---------|
| categories | yes | **0** |
| menu_items | yes | **0** |
| orders | yes | **0** |
| offers | yes | **0** |
| restaurant_tables | yes | **0** |
| restaurant_holidays | yes | **0** |
| pos_terminals | **no** | n/a |
| pos_permission_grants | **no** | n/a |
| pos_sale_idempotency | **no** | n/a |

## Synthetic leftovers

| Query | Count |
|-------|-------|
| categories `nameAr LIKE 'G08-cat%'` with missing parent | **0** |
| `occupancy_g07_terminals` with missing restaurant `scopeId` | **0** |
| `occupancy_toctou_orders` with missing parent | **0** |

## Cleanup policy

G-08 P12 previously left a category orphan; later G-08/TOCTOU cleanups delete only synthetic owners (`980801801–803`, `980901901–902`) and names like `G08-cat%`.

**No automatic deletion of unknown historical rows.** If a future census finds non-synthetic orphans, ownership and a dedicated cleanup program are required before DELETE.

## Strategy if orphans appear later

1. Identify table + `restaurantId` + created-at if present.
2. Classify synthetic test vs copied production.
3. Do not hide them from Commercial COUNT(*).
4. Authorized DELETE only after product sign-off.
