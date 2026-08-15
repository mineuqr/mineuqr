# IDEMPOTENCY

If the current snapshot already matches planId + amount + currency + cycle, insert is skipped.

Duplicate `(subscriptionId, version)`: re-read; match → success; mismatch → fail.

Admin plan/cycle retry after success: current already matches → no second snapshot; subscription update is in the same transaction as the first success.
