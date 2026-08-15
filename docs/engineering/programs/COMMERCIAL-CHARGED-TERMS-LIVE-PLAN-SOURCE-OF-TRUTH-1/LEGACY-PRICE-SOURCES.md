# LEGACY PRICE SOURCES

| Source | Role |
|--------|------|
| `commercial_prices` / `currentPriceForPlan` | **Sole current price authority** |
| Charged Terms snapshot | Immutable commitment; MRR/ARR |
| Binding charged columns | Leftover projection / compatibility only. Not used to create snapshots. Not used for MRR. |
| `subscription_plans` | No price authority |
| `legacyPlanId` | Leftover integer identity only |
| Provider transaction IDs | Not snapshot identity |

Do not backfill snapshots from Binding leftover. 780001 has no recoverable commitment — leave unbound, no snapshot.
