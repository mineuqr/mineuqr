# PRICING-MODEL.md

## Five semantics (must not collapse)

| Name | Definition | Mutability |
|------|------------|------------|
| **Public list price** | Current Live Plan `commercial_prices` for cycle + currency (+ region if applicable) | Editable in Plan Editor; next display |
| **Checkout price** | Amount charged for a **new** purchase | **Target:** equals the Offer’s public list price at checkout start. **Current:** `subscription_plans` (legacy) |
| **Charged terms** | Amount/currency/cycle stored on the binding for this subscription | Immutable until a **classified event** |
| **Renewal price** | Catalog list price **at the renewal/re-bind event**, then written as new charged terms | Changes only at that event |
| **Historical price** | Charged terms and payment records of past events | Never rewritten by catalog edit |

## Price-change invariant (preserved)

Changing the Live Plan catalog price **MUST NOT** silently rewrite existing Charged Terms.

## When a new catalog price becomes applicable

| Event | Applies new catalog list price? |
|-------|----------------------------------|
| Catalog edit only | **No** (display/list only) |
| New checkout | **Target yes** (Offer). Current: no — uses `subscription_plans` |
| Renewal / re-bind | **Yes** — existing architecture (`renewal_uses_current_price`) |
| Upgrade | **Yes** — classify as plan-change re-bind |
| Downgrade | **Yes** — classify as plan-change re-bind |
| Admin activation | **Yes** if it re-binds (current code) |
| Expiration / Frozen | **No** — terms preserved; service blocked |

These events are **not** equivalent. Do not treat “any write” as renewal.

## GAP A decision

The 26.40 vs 39.00 split is a **commercial consistency defect**.

**Target decision:** Checkout SHALL charge the Live Plan public list price of the selected Offer (plan + cycle + currency).

**Until cutover:** `subscription_plans` remains the charge authority (**LEGACY COMPATIBILITY BOUNDARY**). Do not implement the cutover in this program.

**Cutover prerequisites (additional decision):** currency (PayPal USD vs Tap SAR vs catalog USD/SAR), dual-write window, rollback, customer-visible messaging.

---

## Addendum — approved period / renewal policy (2026-08-15)

Historical findings above are unchanged. The Architecture Authority later approved period-lock and renewal-reprice rules. Canonical text: [ADR-ARCH-035 rev 1.1](../../../architecture/adrs/ADR-ARCH-035-commercial-price-semantics.md). Package summary: [PRICING-POLICY-ADDENDUM.md](./PRICING-POLICY-ADDENDUM.md).

Checkout Cutover Design remains open. Do not treat this addendum as cutover authorization.
