# OWNERSHIP MODEL

| Object | Owns |
|--------|------|
| Live Plan / `commercial_prices` | Current offer price |
| `commercial_subscription_charged_terms` | Historical financial commitment (immutable rows) |
| `commercial_subscription_bindings` | 1:1 financial enrollment; leftover charged columns non-authoritative once a snapshot exists |
| `user_subscriptions.planId` | Current Live Plan identity → entitlements |
| Invoice row `amount` | Amount frozen at issue time |
| MRR | Current snapshot (fallback Binding leftover if no snapshot row) |

No second current-price authority. Catalog edits do not insert snapshots.
