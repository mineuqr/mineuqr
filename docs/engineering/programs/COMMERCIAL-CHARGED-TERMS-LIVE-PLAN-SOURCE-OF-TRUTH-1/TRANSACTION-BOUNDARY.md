# TRANSACTION BOUNDARY

| Path | Class | Behavior |
|------|-------|----------|
| Admin plan/cycle change | **A — SQL transaction** | Snapshot insert (if needed) + subscription identity (+ enrollment planId) commit together. Failure rolls back both. |
| Admin create | **B — compensation** | Subscription insert, then Binding leftover + snapshot. Snapshot failure deletes Binding; persist failure deletes the new subscription. |
| Webhook / trial bind | fail-soft | Payment activation unchanged. Snapshot insert recorded; existing snapshot is never versioned by webhook. |

Compensation is not called atomic.
