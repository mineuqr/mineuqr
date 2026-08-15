# IDEMPOTENCY

## Grant

Repeated identical `unit + duration` while a current concession exists returns that row. No second `active` insert.

A different duration/unit while current is `overlap`, not a silent second grant.

## Revise

Repeated identical `unit + duration + reason` returns the current row.

A changed duration inserts version N+1 and supersedes N inside a transaction.

## Cancel

No current concession → return latest historical row. No extra cancel write.

## Concurrency

Inserts run in `db.transaction`. Unique `(subscriptionId, version)` rejects two writers claiming the same next version. The in-transaction re-read of current rows prevents two `active` grants.
