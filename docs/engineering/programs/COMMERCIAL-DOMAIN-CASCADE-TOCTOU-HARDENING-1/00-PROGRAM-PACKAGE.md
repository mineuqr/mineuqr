# 00 — PROGRAM PACKAGE

**Program:** COMMERCIAL-DOMAIN-CASCADE-TOCTOU-HARDENING-1  
**Date:** 2026-08-17  
**Predecessor:** COMMERCIAL-LIMIT-OCCUPANCY-DOMAIN-RACE-TESTS-1 (G-08)  
**STATUS:** PASS — PARENT-DELETE / CHILD-CREATE TOCTOU CLOSED  
**Mode:** FORENSIC AUDIT → ARCHITECTURE DECISION → IMPLEMENT → TIDB CERTIFY  

| Item | Value |
|------|--------|
| Engine | 8.0.11-TiDB-v8.5.3-serverless |
| Branch | mineuqr-stagIn |
| Database | mineuqr |
| Connection | G07_DATABASE_URL only |
| Isolation | SQL user prefix `3BUSFE99csVhDLu` (not Production main) |
| Production mutation | 0 |
| Migration | NONE (0094 untouched; no 0095; no FK) |
| Chosen architecture | Restaurant-row `SELECT … FOR UPDATE` |
| Lock order | Occupancy mutex → restaurant row (quantity paths); restaurant row only (delete / admin / order) |
| TiDB TOCTOU races | 12 passed |
| G-08 P12 | create=rejected, orphanCategories=0, architectureGap=false |
| StagIn orphan census | 0 on existing child tables |
| Build | PASS |
| Check | 193 `error TS*` — this program adds 0 |
| Git / deploy | NONE |

## Mission

A child resource must not commit against a restaurant that has been concurrently deleted. Commercial occupancy remains `COUNT(domain rows)`. This program does not redesign occupancy.

## Result

G-08’s cascade TOCTOU is closed on TiDB for the covered restaurant-owned create paths. Concurrent delete ∥ create leaves `orphan_count = 0`. Occupancy `<= cap` still holds.

## Must not (honored)

POS-specific lifecycle lock · occupancy counter · Redis · app-memory lock · global lock · hide orphans from COUNT · Commercial-owned restaurant lifecycle · modify 0094 · Production mutation · git commit/push · deploy · start G-09 / G-10 / G-11 / Final Occupancy Audit / POS-READ-APIS
