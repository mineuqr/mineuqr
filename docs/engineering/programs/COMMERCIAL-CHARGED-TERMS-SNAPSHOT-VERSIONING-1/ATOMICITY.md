# ATOMICITY

Admin **plan/cycle** change: **A — database transaction** (`db.transaction`): insert snapshot (if needed) then update subscription (+ enrollment planId). Old snapshot rows are not updated.

Admin **create**: still **B — compensation** (subscription insert, then Binding + snapshot; delete subscription on persist failure). Snapshot insert failure deletes the Binding then compensates the subscription.

Webhook bind: remains fail-soft (existing). Snapshot insert errors are recorded, not Admin fail-closed.
