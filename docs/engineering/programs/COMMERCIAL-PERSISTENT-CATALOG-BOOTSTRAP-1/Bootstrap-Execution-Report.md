# Bootstrap Execution Report

## Live TiDB (2026-07-31)

### Blocking defect discovered

```
Failed query: select `id`, `code`, `name`, `intervalCount`, `cc_billing_interval_unit`, ...
Unknown column 'cc_billing_interval_unit' in 'field list'
```

**Fix:** `server/db/schema/commercial/tables.ts` — enum first args aligned to physical columns `intervalUnit` and `state` (no migration).

### After fix — CLI execution

```json
{
  "first": {
    "reason": "already_published",
    "publishedVersions": 3,
    "planCount": 3,
    "billingCycleCount": 2,
    "priceCount": 10,
    "capabilityMappingCount": 35
  },
  "second": {
    "reason": "already_published",
    "publishedVersions": 3,
    "planCount": 3,
    "billingCycleCount": 2,
    "priceCount": 10,
    "capabilityMappingCount": 35
  }
}
```

Idempotent: second run did not duplicate.
