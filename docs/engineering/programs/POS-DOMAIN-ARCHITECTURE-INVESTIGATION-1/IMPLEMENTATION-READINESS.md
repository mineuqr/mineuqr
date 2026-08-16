# IMPLEMENTATION READINESS

## Decision

**READY FOR IMPLEMENTATION**

**PROCEED TO:** `POS-DOMAIN-ARCHITECTURE-IMPLEMENTATION-1`
**WITH MODIFIED IMPLEMENTATION PLAN** (sequence in `RECOMMENDED-IMPLEMENTATION-SEQUENCE.md`)

Not `BLOCKED — ARCHITECTURE REMEDIATION REQUIRED`.

## Q1–Q15

| Q | Answer |
|---|--------|
| Q1 POS Terminal without duplicating Device? | **Yes** — new domain; reference device later |
| Q2 Entitlement from Commercial Projection / Plan? | **Quantity via limits**, not Projection boolean. Projection stays capabilities |
| Q3 Quantity without second entitlement system? | **Yes** — extend `LIVE_PLAN_LIMIT_KEYS` / `readLimitValue` |
| Q4 Direct sale into canonical Order? | **Yes** — `IdentityPlaceOrderService` |
| Q5 POS without Session for direct sale? | **Yes** — ephemeral / sessionless Check already exists |
| Q6 POS reference existing Sessions? | **Yes** — `dining_sessions.activeCheckId` |
| Q7 Use canonical Check? | **Yes** |
| Q8 Initiate Settlement without owning it? | **Yes** — `CheckService` / staff settle pattern |
| Q9 Coexist with Register? | **Yes** — CRMP separate; do not use `mobile_pos` type as terminal |
| Q10 Cashier auth reuse? | **Partial** — reuse tenant + hub; extend with permission catalog; RBAC later |
| Q11 Terminal ≠ hardware? | **Yes if new domain** |
| Q12 Channel survives cashier payment? | **Yes today**; protect in POS PlaceOrder |
| Q13 Cloud-authoritative? | **Yes** — no financial offline |
| Q14 Future add-ons without rebuild? | **Yes** if quantity stays a summed limit in the same resolver |
| Q15 Blockers before implementation? | **None** for Phase 1 contracts, given the constraints above |

## Must implement (Phase 1)

POS domain ownership, Terminal model, Effective POS Entitlement contract, provisioning rule, access/authorization foundation, integration boundary guards, channel reservation.

## Must NOT implement

POS UI, payments, Register, ZATCA, offline finance, add-on billing, Device-as-POS, POS Check/Order/Revenue, Production migrate/seed unless a separate apply program authorizes it.
