# OPEN-DECISIONS

**Program:** COMMERCIAL-MRR-CHARGED-TERMS-MIGRATION-1

These remain open. This program did not decide them.

| ID | Decision | Notes |
|----|----------|-------|
| OD-1 | MRR FX policy | ADR-036 open. Non-USD Charged Terms contribute 0 until a policy exists. |
| OD-2 | Refund-to-binding classification | Refund ≠ Charged Terms / MRR change unless a future ADR says so. |
| OD-3 | Backfill Charged Terms for unbound test/internal rows | Production had 0 bindings (2026-08-14). Eligible + missing terms → 0. No backfill invented. |
| OD-4 | Deprecated `getAdminStatistics` / `computeAdminMrr` | Still reads `subscription_plans`. Not the canonical MRR. Future retirement program. |
| OD-5 | ADR-036 header status field | Still “Governance only” in the ADR file. Optional AA documentation update. |
| OD-6 | SAFE DELETE `subscription_plans` | Still blocked. Residual identity / webhook / DTO / stats / test deps. |

Not opened: Checkout, Payment Provider, Tax, FX implementation, Refund, Credit Note, POS, Staff Access, Inventory.
