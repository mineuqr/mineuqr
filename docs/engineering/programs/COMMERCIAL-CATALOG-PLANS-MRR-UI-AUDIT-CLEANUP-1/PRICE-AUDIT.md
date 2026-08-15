# PRICE-AUDIT.md

## Dual price book — classification

**A. Intentional compatibility boundary** for Checkout charge amounts, **plus** an incomplete retirement (MRR still on the legacy book).

| Purpose | Authoritative source | Typical Professional monthly |
|---------|----------------------|------------------------------|
| Public Pricing display | Live Plan `commercial_prices` (USD, non-regional) | **26.40 USD** |
| Plan Editor | Same catalog | same |
| Checkout charge | `subscription_plans` 30001–30003 | **39.00 USD** |
| Charged terms (after bind) | `commercial_subscription_bindings.chargedAmount` at bind/renewal (from **catalog** at that event) | catalog-at-bind |
| Invoice / payment capture | Payment provider + `user_subscriptions` | checkout amount |
| MRR | `subscription_plans` via `CanonicalMetricsService` | **39.00** monthly-equivalent |

Checkout production book (APPLICATION-CUTOVER-1, unchanged by this program):

| ID | Monthly USD | Yearly USD |
|----|-------------|------------|
| 30001 | 19.00 | 175.00 |
| 30002 | 39.00 | 349.00 |
| 30003 | 99.00 | 899.00 |

Catalog book (2026-08-15 snapshot): Basic **19.00 / 199.00** (drift vs certified 0/0); Professional 26.40 / 264.00 + SAR 99 / 990; Enterprise 79.73 / 797.33 + SAR 299 / 2990.

The two books **do not overwrite each other**. 0086 never wrote `subscription_plans`. Checkout never writes catalog prices.

## Verdict

- Checkout use of `subscription_plans`: **LEGACY_COMPATIBILITY** (required until a dedicated checkout cutover).
- MRR use of `subscription_plans`: **DUPLICATE_AUTHORITY** relative to charged terms / catalog — **GOVERNANCE GAP**.
- Display vs charge mismatch on Pricing (shows 26.40, charges 39) is a **truthfulness gap**, not a cleanup candidate.
