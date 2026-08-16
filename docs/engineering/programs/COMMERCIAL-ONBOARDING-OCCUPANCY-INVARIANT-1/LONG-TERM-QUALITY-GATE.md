# LONG-TERM QUALITY GATE

| Concern | Evaluation |
|---------|------------|
| Many restaurants | Additional locations still use occupancy + `checkLimit`. Onboarding only authorizes 0→1. |
| Multiple app instances | Plan read is Catalog SSOT; no in-memory lock. Duplicate email still unique-constrained. |
| Trial cap changes | Invariant is proposedTotal 1 ≤ effective cap (or unlimited). Not hard-coded `restaurants = 1`. |
| Future Live Plan edits | Operator may set Professional restaurants to 0; signup fails closed. |
| Future billing / entitlements | Decision uses the same trial plan resolver as subscription bind. |
| Tenant isolation | Plan-scoped onboarding check; owner-scoped occupancy afterward. |
| Backward compatibility | Supported Professional trial (cap 5) still onboards. |
| Operational reliability | Catalog down → fail closed, no half-created owner restaurant. |
| Maintainability | Commercial module owns the decision; restaurant insert stays in auth onboarding. |

Premature work avoided: no POS lock, no occupancy rewrite, no 0095, no onboarding redesign.
