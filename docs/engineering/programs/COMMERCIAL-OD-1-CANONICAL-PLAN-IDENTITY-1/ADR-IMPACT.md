# ADR-IMPACT

Existing ADR files were **not** edited.

| ADR | Amendment required to accept OD-1? |
|-----|-------------------------------------|
| ADR-ARCH-034 Commercial Catalog Authority | **NO for constitution.** 034 already states Live Plan owns plan identity (code / UUID / name). OD-1 *selects* UUID as the canonical internal id and code as the business key. That is a refinement, not a new catalog authority. |
| ADR-ARCH-035 Commercial Price Semantics | **NO.** Identity ≠ price. |
| ADR-ARCH-036 Commercial MRR Constitution | **NO.** Identity ≠ MRR. |

Subscription, tenant, entitlement, payment, and reporting ADRs: no change. Identity is not authorization, not settlement, not Check revenue.

## Stale ADR text (out of this program)

ADR-034 / 035 / 036 still contain sentences that Checkout and current MRR read `subscription_plans`. Residual cleanup and the Charged Terms MRR program have already moved those runtimes. That stale wording is **not** an OD-1 blocker and is **not** amended here.

## Proposed ADR-034 identity addendum (NOT APPLIED)

If Architecture Authority later registers this decision into 034, suggested text:

> **Canonical internal plan identity.** `commercial_plans.id` (UUID) is the one canonical internal Commercial Plan identity (I-OD1-01). `commercial_plans.code` is the stable business/catalog key (I-OD1-02). Integer `legacyPlanId` / `subscription_plans.id` are not canonical identities (I-OD1-03, I-OD1-04).

This program documents the proposal and **STOPS**. It does not patch the ADR file. A separate ADR registration program may apply it.
