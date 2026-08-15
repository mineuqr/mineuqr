# FINAL REPORT

**Program:** COMMERCIAL-CHARGED-TERMS-SNAPSHOT-PRODUCTION-APPLY-1  
**Date:** 2026-08-15  
**STATUS: 0089 APPLIED AND SCHEMA-CERTIFIED**

## Production target

`DATABASE()=mineuqr`, TiDB Cloud prod / TLS / port 4000.

## Execution

`pnpm db:migrate` `2026-08-15T17:43:02.666Z` → `17:43:10.782Z`, exit **0**.

## Journal

Before: **0088** `0836fac35ca3515db9958e232320dd9e0f5d44bf60684d74badff8661daa243b`  
After: **0089** `45dd198fe62f78746ef245e5091fc146ee383235f6d5a01b5d2b590b06c37e6d` (count = 1, matches local)

## Backup

**WAIVED** by Architecture Authority for this additive empty 0089 only. No backup claimed. Recovery not tested.

## Schema

`commercial_subscription_charged_terms` present with required columns and indexes.

## Snapshot row count

**0** (intentional).

## Counts before / after

subscriptions 7/7 · bindings 3/3 · plans 3/3 · prices 10/10

## Mutation proof

CREATE TABLE + CREATE INDEX + `__drizzle_migrations` row for 0089.  
Snapshot rows created = 0. Subscriptions changed = 0. Bindings changed = 0. Historical prices reconstructed = 0.

## 780001

Unchanged: active, yearly, unbound, Live Plan `d836bd10-9d9f-4408-a076-f921354d785a`.

## Authority

Current price = `commercial_prices`. Historical commitment = empty snapshot table. MRR/ARR after deploy = current snapshot / ×12. Forbidden fallbacks not introduced.

## Git / deploy

HEAD `e936e654`. **NOT COMMITTED. NOT PUSHED. NOT DEPLOYED.**

Next: separately authorized **application deploy** of the snapshot-aware runtime. Do not combine with this program.
