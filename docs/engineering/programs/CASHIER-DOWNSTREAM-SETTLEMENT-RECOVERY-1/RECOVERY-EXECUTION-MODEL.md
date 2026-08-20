# RECOVERY-EXECUTION-MODEL

Smallest platform-compatible mechanism: **database-backed sweep** over existing CF/Check/SR rows. No Redis/Kafka/SQS. No 0098.

| Trigger | Awaits HTTP? | Survives process death? |
|---|---|---|
| `void completeCashier…` after Confirm | No | No (fast path only) |
| POS idempotency replay `schedule…` | No | Yes, on next request |
| Boot + 15s `sweepIncomplete…` | No | Yes |

Retry: transient errors increment attempt, backoff 1s…60s on **sweep** only. Direct recover (POS/manual) runs immediately. After 8 sweep-visible failures, `cashier_downstream_settlement_recovery_attention` is logged; work is not discarded.

Observability: opsLog metadata includes recoveryId (`collectionFactId`), restaurant, paymentIntentId, orderId, checkId, state, attemptCount, lastError, nextRetryAt.
