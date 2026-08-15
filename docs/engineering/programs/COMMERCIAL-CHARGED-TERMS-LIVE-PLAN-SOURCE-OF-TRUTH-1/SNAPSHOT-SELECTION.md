# SNAPSHOT SELECTION

Current snapshot for subscription S:

```
WHERE subscriptionId = S
ORDER BY effectiveFrom DESC, version DESC
LIMIT 1
```

Insert-only. No `effectiveTo`. No UPDATE of financial columns.

`effectiveFrom` = commitment commit time (`nowIso()`). Immediate changes only.

Webhook: if a snapshot already exists, return it. Do **not** create Snapshot #2 from a later catalog price on bind retry.
