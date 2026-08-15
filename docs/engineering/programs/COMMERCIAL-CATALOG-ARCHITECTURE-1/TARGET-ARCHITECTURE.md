# TARGET-ARCHITECTURE.md

```
LIVE PLAN  (catalog definition + sellable product + entitlement template)
    ├── identity (code, name)
    ├── capabilities (composition)
    ├── limits (composition)
    ├── public list prices (commercial_prices)
    └── commercial availability (hidden / sort / trial policy)
            │
            ▼
COMMERCIAL OFFER  (selected Live Plan + cycle + currency at a moment)
            │
            ▼
CHECKOUT  (must charge the Offer list price for that cycle/currency)
            │
            ▼
SUBSCRIPTION INSTANCE  (user_subscriptions)
            │
            ▼
CHARGED TERMS  (binding; immutable until classified commercial event)
            │
            ▼
ENTITLEMENTS  (dynamically resolved from current Live Plan + account state)
            │
            ▼
ACCOUNT STATE  ACTIVE | FROZEN | NONE
            │
            ▼
SERVER  CanUse(account, capability) / checkLimit
            │
            ▼
UI  presentation of the same decisions
            │
            ▼
MRR  monthly-equivalent of charged terms for included states
     ≠ Check Revenue
```

## Live Plan meaning

A Live Plan is **all three**:

| Role | Meaning |
|------|---------|
| Catalog definition | What the product is (identity, capabilities, limits, list prices) |
| Sellable product | What Pricing may offer |
| Entitlement template | What a bound ACTIVE account receives **now** (capabilities/limits follow current Live Plan) |

A Live Plan is **not**:

- a customer contract (that is Charged Terms + subscription instance);
- a versioned price snapshot (retired);
- Owner Access Mode;
- operational Check Revenue.

## Non-collapse rule

Public list price, checkout price, charged terms, renewal price, and historical price are **five semantics**. They must not share one mutable field.
