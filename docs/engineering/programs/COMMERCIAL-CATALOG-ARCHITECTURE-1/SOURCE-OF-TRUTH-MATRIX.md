# SOURCE-OF-TRUTH-MATRIX.md

ADR-1. “Source of truth” here means **authoritative owner for a named semantic**, not a slogan.

| Concept | Semantic scope | Current source | Target source | Owner | Consumers | Migration? |
|---------|----------------|----------------|---------------|-------|-----------|------------|
| Plan identity | Catalog code / UUID | `commercial_plans` | same | Catalog | Editor, Pricing, binding | No |
| Plan identity (payment) | Legacy int 30001–30003 | `user_subscriptions.planId` / bridge | Bridge until checkout cutover | Payments compatibility | Checkout, MRR today | Yes, later |
| Capabilities | Composition | Live bundle | same | Catalog | Hub, Editor, Pricing | No |
| Limits | Composition | `commercial_limit_values` | same | Catalog | `checkLimit`, Editor | No |
| Public list price | What Pricing displays | `commercial_prices` | same | Catalog | Public Pricing, Editor | No |
| Checkout price | What a **new** purchase charges | `subscription_plans` | **Offer = Live Plan list price** for selected cycle/currency | Payments (cutover) | Checkout | **Yes — gated** |
| Charged terms | Contract of **this** subscription period | Binding at last classified event | same | Subscription binding | Entitlement display, **target MRR** | No rewrite |
| Renewal price | Price captured at renewal/re-bind | Current catalog at event | same | Binding write | Next period terms | No |
| Historical price | Past commercial event | Binding + payment records | same (immutable) | Binding / payments | Audit | No |
| Subscription instance | Status, period, cycle | `user_subscriptions` | same | Subscription | Hub, Frozen, Checkout | No |
| Account state | ACTIVE / FROZEN / NONE | Hub `commercialAccountState` | same | Entitlement hub | UI, Frozen, QR | No |
| Entitlements | CanUse / limits | `resolveOwnerEntitlements` | same | Hub | Server, UI | No |
| MRR | Point-in-time recurring commercial metric | `subscription_plans` | **Charged terms**, monthly-equivalent | Commercial metrics | Admin KPIs / reports | **Yes — gated** |
| Operational revenue | Paid Check.grandTotal | Check / Settlement | same | Financial (ADR-020) | Reporting | **Forbidden to merge with MRR** |
| Owner mode | FULL_PLATFORM / SIMULATED_PLAN | `platform_owner_access_mode` | same | Owner Access | Hub | No |

`subscription_plans` **must no longer own** (target): catalog composition, limits, public list price, MRR, entitlements. It may remain a **read/charge compatibility layer** until checkout cutover.
