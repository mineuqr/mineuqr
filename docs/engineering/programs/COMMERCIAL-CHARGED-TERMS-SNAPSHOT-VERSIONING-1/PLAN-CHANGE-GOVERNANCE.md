# PLAN CHANGE GOVERNANCE

Admin selects Live Plan B → `resolveLivePlanById` → `currentPriceForPlan(B, cycle)` → insert snapshot #N+1 → update `user_subscriptions.planId` (and enrollment `bindings.planId`) in **one DB transaction**.

Snapshot #N is not updated. Amount is Plan B’s current offer, not reconstructed history.
