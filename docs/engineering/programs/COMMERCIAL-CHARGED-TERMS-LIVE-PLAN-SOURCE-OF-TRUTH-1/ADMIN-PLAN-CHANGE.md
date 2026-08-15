# ADMIN PLAN CHANGE

`resolveLivePlanById` → `currentPriceForPlan(newPlan, selectedCycle)` → `applyAdminCommercialIdentityChange` in **one SQL transaction**: insert Snapshot #N+1 (if offer differs), then update `user_subscriptions.planId` (and enrollment `bindings.planId` only).

Snapshot #N is not updated. Amount is the **new** Live Plan’s **current** offer, not the old snapshot and not Binding leftover.
