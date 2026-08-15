# ENTITLEMENT IMPACT

During an active free period:

- `user_subscriptions.planId` remains the selected Live Plan UUID
- Entitlement hub continues to resolve from that Live Plan
- Status remains `active`, not `trial`

After expiration:

- Existing lifecycle rules apply
- Free-first subscriptions have **no** paid snapshot, so expiration does **not** create a paid commitment
- There is no silent free → paid conversion

`getCommercialEntitlements` does not read concessions or Charged Terms. Concession is financial suppression, not a second entitlement matrix.

Trial remains `commercialPlan=TRIAL` via `status=trial`. Combining trial with a free period is rejected (`trial_conflict`).
