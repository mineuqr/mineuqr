# POST-APPLY VERIFICATION

**Queried at:** `2026-08-16T18:15:45.772Z` (after second migrate)  
**Server time:** `2026-08-16T15:15:38.000Z`  
**Mutation:** NONE (read-only verification)  
**Evidence:** `POST-APPLY-VERIFICATION.json`

## Target

`DATABASE()=mineuqr` PRODUCTION TLS 4000.

## Journal

| Order | Tag | Hash | id |
|------:|-----|------|---:|
| 1 | 0091_pos_terminals | `05872dc0…` | 6174102 |
| 2 | 0092_pos_permission_grants | `e7bf4f73…` | 6174103 |
| 3 | 0093_pos_sale_idempotency | `778caa62…` | 6174104 |
| 4 | 0094_commercial_limit_occupancy_locks | `134a49bf…` | **6204102** (terminus) |

`0094` is registered **exactly once** after the second migrate.

## New table

| Table | Exists | Rows | PK |
|-------|--------|-----:|----|
| `commercial_limit_occupancy_locks` | yes | 0 | (`scopeKind`,`scopeId`,`limitKey`) |

Table count: 87 → **88**. Occupancy-like tables: only this one.

## Unrelated schema

POS tables unchanged (still 0 rows). No POS lock tables. No `commercial_limit_values` DDL.

## Counts vs baseline

All listed financial/commercial/resource counts are unchanged. See `FINANCIAL-ISOLATION.md`.

## 780001

Unchanged: active / yearly / `d836bd10-9d9f-4408-a076-f921354d785a` / `2027-06-21T10:47:36.000Z`.
