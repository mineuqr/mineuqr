# SNAPSHOT RUNTIME PROOF

## Deploy did not create snapshots

| When | Snapshot rows |
|------|----------------|
| Pre-commit gate `2026-08-15T17:55:40.669Z` | 0 |
| Post-deploy `2026-08-15T18:03:21.606Z` | 0 |

`DATABASE()=mineuqr`. Journal hash remains `45dd198fe62f78746ef245e5091fc146ee383235f6d5a01b5d2b590b06c37e6d` (0089).

## NEW commitment path (source)

```
Live Plan UUID
  → commercial_prices / currentPriceForPlan(planId, billingCycleCode)
  → insertImmutableChargedTermsSnapshot (Snapshot #1)
  → MRR reads current snapshot only
```

Sources allowed: `admin_create`, `admin_update`, `webhook_bind`. No `migration_0089`. No catalog-edit source.

## Existing historical rows

Unchanged. No backfill. Binding leftover charged columns remain non-authoritative for MRR.

## Catalog price edit

Does not insert or UPDATE snapshots. Historical commitment stays on the snapshot row created at commitment time.

## Current snapshot rule

`subscriptionId` + `ORDER BY effectiveFrom DESC, version DESC LIMIT 1`.
