# REGRESSION-VALIDATION.md

Customer paths remain the existing Subscription Runtime branch after the owner check:

- customer Basic / Professional / Enterprise (bound Live Plan or Legacy Bridge)
- unbound Legacy compatibility
- subscription expiration
- Checkout, invoices, payments — not modified
- Public Pricing catalog discovery — unchanged except owner-only simulation note
- Live Plan Editor — unchanged

Owner simulation never writes customer subscriptions, bindings, entitlements, plans, or customer cache keys.
