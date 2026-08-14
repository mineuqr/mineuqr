# BILLING-ISOLATION.md

Simulation and Full Platform **must not** create or mutate:

- `user_subscriptions` (including `600001`)
- `subscription_plans`
- invoices, payments
- `commercial_subscription_bindings`
- checkout sessions
- charged terms

`600001` remains historical. Do not renew, extend, bind, or delete it as part of this architecture.

## Pricing UX (recommended: C)

Mark owner surfaces **Simulation — no charge**.

| Option | Verdict |
|--------|---------|
| A. Informational only | Acceptable if no checkout chrome |
| B. Normal plan pricing (same as customer) | Reject — invites a real charge |
| C. Explicitly marked simulation | **Approve** |

Owner may see capabilities, limits, and Presentation. Checkout buttons on the owner simulation chrome are hidden or disabled. `/pricing` customer checkout remains a separate, real billing path and is not how Access Mode is set.
