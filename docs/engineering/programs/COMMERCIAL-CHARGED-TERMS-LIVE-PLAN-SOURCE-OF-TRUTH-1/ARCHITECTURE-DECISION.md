# ARCHITECTURE DECISION

Approved graph:

```
commercial_plans.id (UUID)
        ↓
commercial_prices (current offer)
        ↓
commercial commitment (create / plan change / cycle change)
        ↓
immutable commercial_subscription_charged_terms
        ↓
MRR → ARR = MRR × 12
```

Rejected: Binding charged fields → snapshot (previous 0089 population).

Existing Production bindings without a trustworthy Live-Plan-at-commitment snapshot stay **without** a snapshot. Do not infer from today’s catalog or leftover Binding amounts.
