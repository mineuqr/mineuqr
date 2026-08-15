# IDEMPOTENCY

Already entitled + matching current snapshot (paid) or matching current concession (free): return `changed=false`, no new version.

Terminated: always a new commitment (Snapshot N+1 or new concession), even if the amount/unit matches history.

Unique `(subscriptionId, version)` remains the concurrency fence.
