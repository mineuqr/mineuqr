# TIDB RACE RESULTS

**Program:** COMMERCIAL-DOMAIN-CASCADE-TOCTOU-HARDENING-1  
**File:** `server/db/__tests__/commercialDomainCascadeToctou.tidb.test.ts`  
**Date:** 2026-08-17  

## Identity

```
verdict: ACCEPT_NON_PRODUCTION
sourceEnvKey: G07_DATABASE_URL
host: gateway01.eu-central-1.prod.aws.tidbcloud.com
database: mineuqr
userPrefix: 3BUSFE99csVhDLu
sameSqlUserAsProductionMain: false
engine: 8.0.11-TiDB-v8.5.3-serverless
txn: pessimistic
session isolation: REPEATABLE-READ
occupancy/delete txns: READ COMMITTED
```

Hostname matches the Production gateway; isolation is the **SQL user prefix**, not the hostname. Production mutation = 0.

## TOCTOU_EVIDENCE (12/12 passed)

| Race | Result |
|------|--------|
| DELETE ∥ category | create=**rejected**, restaurant=0, categories=0 |
| DELETE ∥ item | restaurant=0, items=0, categories=0 |
| DELETE ∥ POS provision | restaurant=0, terminals=0 |
| DELETE ∥ POS replace | restaurant=0, terminals=0 |
| DELETE ∥ order | restaurant=0, orders=0 |
| DELETE ∥ DELETE | restaurant=0, categories=0 |
| CREATE ∥ DELETE ∥ CREATE | restaurant=0, categories=0 |
| CREATE ∥ CREATE | createA=fulfilled, createB=rejected, restaurant=1, categories=2 (cap 2) |
| Cross-tenant | elapsedMs=1549; A restaurant=0; B restaurant=1, categories=1 |
| Failure after insert | restaurant=1, categories=0 |
| Missing restaurant 2147483000 | `RestaurantGoneError` |

**orphan_count = 0** for every covered resource when the parent is gone.

## G-08 P12 (re-run)

```
cascadeToctou: {
  parentLookupSucceeded: true,
  restaurantRemaining: 0,
  create: "rejected",
  orphanCategories: 0,
  architectureGap: false
}
```

Previously (G-08 before this program): `orphanCategories=1`, `architectureGap=true`.
