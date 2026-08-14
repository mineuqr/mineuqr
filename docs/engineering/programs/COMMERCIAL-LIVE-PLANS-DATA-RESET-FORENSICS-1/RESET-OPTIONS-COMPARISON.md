# RESET-OPTIONS-COMPARISON.md

**Program:** COMMERCIAL-LIVE-PLANS-DATA-RESET-FORENSICS-1

All options assume **no** deletion of `users`, `restaurants`, orders, settlement, `user_subscriptions`, `invoices`, `payments`, `subscription_history`, `subscription_plans`.

---

## OPTION A — Preserve commercial plan records and convert them to Live Plans

Equivalent to applying current 0086 on this database.

| Axis | Assessment |
|------|------------|
| Data safety | Catalog FKs to subscribers: none. Financial rows untouched. |
| Implementation complexity | Low (file already written) |
| Runtime risk | **High** — published live identity becomes `001`/`002`; Basic price 0 USD; standard plans unpublished |
| Migration risk | High — DROP + wrong composition fallback |
| Rollback | Hard after DROP |
| Suitability | **Poor** for current MineuQR state |

---

## OPTION B — Retain required data; recreate only Basic / Professional / Enterprise

Keep `001`/`002` rows and retired standard rows, then insert/overwrite the three approved live plans.

| Axis | Assessment |
|------|------------|
| Data safety | Financial/subscription instance retained |
| Implementation complexity | Medium — must hide or delete `001`/`002` anyway or they remain published storefront plans |
| Runtime risk | Medium — leftover published `001`/`002` compete with approved codes |
| Migration risk | Medium |
| Rollback | Easier than DROP if versions kept |
| Suitability | Inferior to a full catalog wipe because leftover admin plans remain |

If `001`/`002` are deleted as part of B, B **collapses into C**.

---

## OPTION C — Full Commercial Catalog data reset + clean Live Plan bootstrap

Wipe `commercial_*` aggregate/versioning tables (or truncate), add live-plan schema, bootstrap three live plans. **Retain** all subscription instance and financial tables.

| Axis | Assessment |
|------|------------|
| Data safety | **Highest for the approved product** — no conversion of retired/admin rows; financial facts kept |
| Implementation complexity | Medium — replace 0086; run bootstrap once |
| Runtime risk | Low **after** code+schema+bootstrap land together; unbound subscribers keep legacy `subscription_plans` |
| Migration risk | Controlled if DROPs are a second phase |
| Rollback | Restore catalog from backup / re-bootstrap; subscriptions never moved |
| Suitability | **Best match** to actual DB: empty bindings, retired standard plans, published admin extras, no customer catalog consumers |

---

## Recommendation

**OPTION C** — see RESET-RECOMMENDATION.md.
