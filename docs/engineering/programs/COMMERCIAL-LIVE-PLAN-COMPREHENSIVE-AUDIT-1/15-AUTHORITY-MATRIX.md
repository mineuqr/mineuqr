# 15 — AUTHORITY MATRIX

Verified against actual code, not naming.

| Domain | Canonical Authority | Verified? |
|--------|---------------------|-----------|
| Plan identity | `commercial_plans.id` | **Yes** (storage, public, checkout, trial). Webhook may **ingress** leftover integer then persist UUID. |
| Business key | `commercial_plans.code` | **Yes** |
| Offer price | Live Plan `commercial_prices` (global row at checkout) | **Yes**. Regional unused at charge. |
| Capabilities | Live Plan bundle → Entitlement Hub (`requireFeature`) | **Yes** for subscribed UUID. **No-sub path uses `planFeatureMatrix`. |
| Limits | Live Plan limit profile → Entitlement Hub | Same as capabilities |
| Public catalog | Live Plan **projection** | **Yes** — not write SSOT |
| Checkout price | Live Plan Offer | **Yes** (number). Tap **currency label** is not catalog. |
| Customer historical terms | Charged Terms on bindings | **Yes** when bound; unbound = none |
| MRR | Charged Terms monthly equivalent | **Yes** — not catalog, not `subscription_plans` |
| Payment | Provider capture / Settlement | **Yes** |
| Revenue | Paid Check | **Yes** (not Live Plan) |
| Invoice legal behavior | Country Compliance | **Not implemented**; PDF uses Charged Terms + USD |
| Tax calculation | Tax Policy (check/restaurant) | **Yes** — not Live Plan runtime |
| Subscription identity | `user_subscriptions` row | **Yes** |
| Provider transaction | PayPal order id / Tap charge id | **Yes** |
| Cash | Register / Shift | **Yes** (out of catalog) |
| Analytics | Reporting / CRS | **Yes** — `planCode` derived from Live Plan |
