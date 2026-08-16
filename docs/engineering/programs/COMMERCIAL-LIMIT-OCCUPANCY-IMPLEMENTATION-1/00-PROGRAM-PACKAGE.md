# 00 — PROGRAM PACKAGE

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-IMPLEMENTATION-1  
**Date:** 2026-08-16  
**Mode:** IMPLEMENTATION AFTER CERTIFIED ARCHITECTURE  
**Predecessor:** COMMERCIAL-LIMIT-OCCUPANCY-ARCHITECTURE-1 (PASS — SHARED COMMERCIAL OCCUPANCY HARDENING REQUIRED)  
**STATUS:** PASS — LOCALLY CERTIFIED  
**Next program:** POS-READ-APIS-IMPLEMENTATION-1  

| Item | Value |
|------|--------|
| Scope | Shared Commercial Limit Occupancy primitive (not POS-specific) |
| Lock table | `commercial_limit_occupancy_locks` |
| Migration | `0094_commercial_limit_occupancy_locks` **CREATED**, **not applied to Production** |
| Helper | `withCommercialLimitOccupancy` in `server/subscription-runtime/commercialLimitOccupancy.ts` |
| Cap oracle | existing `checkLimit()` |
| Occupancy source | domain `COUNT(*)` (caller-owned) |
| Combined regression | 56 files / 377 tests passed |
| Real DB concurrency | 10 passed on isolated Docker MySQL 8.0 (not Production TiDB) |
| Build | PASS |
| Check | 188 preexisting `error TS*` — matches baseline 188 |
| Production mutation | 0 |
| Commit / push / deploy | NONE |

## Mission

Eliminate the certified check-then-act race (`checkLimit()` then later INSERT) with one tenant-scoped Commercial occupancy primitive consumed by every quantity-limited create path that already uses `checkLimit`.

## Implemented

Tenant lock row → `SELECT … FOR UPDATE` → `checkLimit` → domain `COUNT(*)` → domain create → COMMIT, on one Drizzle connection.

Adopted: `restaurants`, `categories`, `items`, `posTerminals`.

Not adopted (no live quantity occupancy): `staffAccounts`, `branches`, `devices`.

## Must not (honored)

POS-specific lock · occupancy counter as source of truth · lock Live Plan / `commercial_limit_values` · global lock · reservations · distributed locks · application-memory locks · rewrite Commercial · Production apply · commit / push / deploy.

## Commercial Capability Impact

```
Commercial Capability Impact: NO (hardening of existing quantity limits; no new capability key)
Required Capability: existing limit keys restaurants | categories | items | posTerminals
Affected Operations: restaurant.create, category.create, menuItem.create, POS terminal slot-consuming provision
```
