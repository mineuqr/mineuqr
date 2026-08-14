# OWNER-UI.md

Owner-only control: `OwnerAccessControl` on Dashboard (list + restaurant detail).

- Full Platform → Simulate a Plan (Live Plans from catalog)
- Simulating {plan} → Return to Full Platform
- Label: **Simulation — No Charge**
- Mode load failure → unavailable/error (does not assume Full Platform)

Pricing: `OwnerAccessPricingNote` plus checkout CTA suppression for the owner. Checkout implementation is unchanged; no invoice, payment, or subscription is created.

Commercial Plan Editor is unchanged and does not host owner-access mutations.
