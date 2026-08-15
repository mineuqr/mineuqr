# IMPLEMENTATION-SEQUENCE.md

Audit → Stabilize → Harden → Expand.

**Do not start these automatically.**

| Order | Program (proposed name) | Gate |
|-------|-------------------------|------|
| 0 | Accept ADR-034 / 035 / 036 into registry | Architecture Authority |
| 1 | Checkout cutover **design** (currency, dual-write, rollback, messaging) | After ADR-035 Accepted |
| 2 | COMMERCIAL-CHECKOUT-LIVE-PLAN-PRICE-1 | After (1) approved |
| 3 | MRR FX + refund-to-binding decisions | After ADR-036 Accepted |
| 4 | COMMERCIAL-MRR-CHARGED-TERMS-1 | After (3) |
| 5 | COMMERCIAL-PRICING-LIMITS-PRESENTATION-1 | Optional; presentation only |
| 6 | Per-capability enforcement (ordering/devices already done) | CE-04 per key |
| 7 | Retire `isSubscriptionActive` on template/color/font **per mutation** | After hub grant named |
| 8 | Remove admin skip on those mutations | CE-05 |

Forbidden to start before gates: Checkout code, MRR code, Limits redesign, catalog wipe, `subscription_plans` drop.
