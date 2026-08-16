# 0094 NON-PRODUCTION APPLY

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-TIDB-CONCURRENCY-PROOF-1  
**Date:** 2026-08-16  
**Target:** TiDB Cloud branch `mineuqr-stagIn`, database `mineuqr`  
**Connection:** `G07_DATABASE_URL` only  

## Result

| Field | Value |
|-------|--------|
| **0094 NON-PRODUCTION APPLY** | **PASS** |
| **TABLE** | **PRESENT** |
| **MIGRATION JOURNAL** | **EXACTLY ONCE** |
| **SECOND MIGRATION RUN** | **NO-OP** |
| **PRODUCTION** | **UNTOUCHED** |

## Pre-apply

| Check | Result |
|-------|--------|
| Engine | 8.0.11-TiDB-v8.5.3-serverless |
| Database | mineuqr |
| SQL user distinct from Production main | yes |
| `commercial_limit_occupancy_locks` | absent |
| Journal hash 0094 count | 0 |

`pnpm db:migrate` was **not** used. Branch `__drizzle_migrations` had 4 rows whose hashes are not the local 0000–0093 set. A full kit migrate would have attempted 0000–0093. This program applied **only** the approved file `drizzle/0094_commercial_limit_occupancy_locks.sql` plus one `__drizzle_migrations` insert (same hash/when as the local journal). No new migration file.

## Post-apply

| Field | Value |
|-------|--------|
| Table | `commercial_limit_occupancy_locks` |
| PRIMARY KEY | `scopeKind,scopeId,limitKey` |
| Columns | scopeKind varchar(16) PRI, scopeId int PRI, limitKey varchar(128) PRI, createdAt timestamp DEFAULT CURRENT_TIMESTAMP |
| Hash (SHA-256 of local 0094 SQL) | `134a49bf9ce3…` (full hash matches Production apply evidence) |
| Journal id | 873421 |
| Journal count for that hash | 1 after first apply, 1 after second apply |

Second apply detected table + hash and performed **NO-OP**.

## Production

No `DATABASE_URL` connection. No `main` apply. Production mutation **0**.

## Not started

Concurrency drill, G-08, git, deploy.
