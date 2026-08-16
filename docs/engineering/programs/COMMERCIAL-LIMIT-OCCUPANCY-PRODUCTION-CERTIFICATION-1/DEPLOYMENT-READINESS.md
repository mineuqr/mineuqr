# DEPLOYMENT READINESS

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-PRODUCTION-CERTIFICATION-1  
**This program does not deploy.**

## Checks

| Item | Result |
|------|--------|
| Schema compatibility | PASS — lock table + PK + columns match Drizzle / helper |
| Migration compatibility | PASS — 0094 exactly once, certified hash |
| Commercial helper compatibility | PASS — `INSERT IGNORE` + RC + `FOR UPDATE` + COUNT + `checkLimit` + create |
| Router / service wiring | PASS — restaurants, categories, items, POS provision / reactivate / replace |
| Error semantics | PASS — G-06 tRPC; G-04 HTTP onboarding |
| Transaction requirements | PASS — committed mutex then RC occupancy txn |
| Required Production schema | PASS — no missing table / PK |
| Required Commercial table | PASS — `commercial_limit_occupancy_locks` |
| Required index / constraint | PASS — PRIMARY `(scopeKind, scopeId, limitKey)` |
| Over-cap leftover | G-11 Policy B — not a deploy blocker |
| Missing `posTerminals` on Live Plans | NON-BLOCKING / required before POS commercial use |
| Governance tail 0093 vs journal 0094 | FOLLOW-UP in Git program — not a schema blocker |

## Decision

**READY FOR APPLICATION DEPLOYMENT**

Ready means: the current working-tree occupancy application can be deployed against the already-migrated Production schema.

It does **not** mean deploy now. Required sequence after review:

1. This certification PASS (here)
2. Git / governance correction `0093 → 0094`
3. Commit
4. Push
5. Application deployment
6. Post-deployment Commercial occupancy smoke / certification

Only after successful post-deployment verification: `POS-READ-APIS-IMPLEMENTATION-1`.
