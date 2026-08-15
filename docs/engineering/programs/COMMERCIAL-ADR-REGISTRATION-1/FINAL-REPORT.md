# FINAL-REPORT.md — COMMERCIAL-ADR-REGISTRATION-1

**Date:** 2026-08-15  
**Program result:** **ADR REGISTRATION COMPLETE**

Overall commercial architecture remains:

> **ARCHITECTURE NOT READY — ADDITIONAL DECISION REQUIRED**

---

## A. ADR Registry before

| Item | Value |
|------|-------|
| Highest registered | ADR-ARCH-033 |
| 034 / 035 / 036 in registry | **No** |
| Collision | **None** (unpublished RBAC/Tenant/Subscription suggestions were never registered) |

## B. ADRs registered

| ID | Title | Status |
|----|-------|--------|
| ADR-ARCH-034 | Commercial Catalog Authority | **Accepted** (governance) |
| ADR-ARCH-035 | Commercial Price Semantics | **Accepted** (governance) |
| ADR-ARCH-036 | Commercial MRR Constitution | **Accepted** (governance) |

Implementation status for all three: **Governance only**.

## C. Decisions captured

- **034:** Live Plan is catalog authority (identity, capabilities, limits, public list price, entitlement template). Not the customer contract. Contract = subscription instance + Charged Terms. Catalog price edit must not rewrite Charged Terms. New price only at New Checkout / Renewal-Rebind / Upgrade / Downgrade (distinct). `CanUse` is server-side; only `ordering` and `devices` are fully enforced today. `isSubscriptionActive` is coarse liveness, not the hub.
- **035:** Five+ price semantics; subscription and MRR currency **USD**; menu SAR is separate. `subscription_plans` = legacy compatibility charge layer. 26.40 vs 39.00 = source-of-truth defect, **not fixed**. Future Checkout = Live Plan Offer list price.
- **036:** MRR = monthly-equivalent Charged Terms of qualifying ACTIVE paid subscriptions. ≠ Check Revenue. Current `subscription_plans` MRR is **non-compliant** and **not modified**. Exclusions: trial, Frozen, NONE, owner/FULL_PLATFORM/SIMULATED_PLAN, complimentary/zero.

## D. Open decisions (preserved — not solved)

1. **Checkout cutover design**  
2. **MRR FX policy** (explicitly OPEN in ADR-036)  
3. **Refund-to-binding classification** (Refund ≠ contract change unless a future ADR says so)

## E. Files changed

- `docs/architecture/adrs/ADR-ARCH-034-commercial-catalog-authority.md` (**new**)
- `docs/architecture/adrs/ADR-ARCH-035-commercial-price-semantics.md` (**new**)
- `docs/architecture/adrs/ADR-ARCH-036-mrr-constitution.md` (**new**)
- `docs/architecture/constitution/ADR-Registry.md`
- `docs/engineering/programs/COMMERCIAL-CATALOG-ARCHITECTURE-1/ADR-ARCH-034-commercial-catalog-authority.md` (pointer to canonical)
- `docs/engineering/programs/COMMERCIAL-CATALOG-ARCHITECTURE-1/ADR-ARCH-035-commercial-price-semantics.md` (pointer)
- `docs/engineering/programs/COMMERCIAL-CATALOG-ARCHITECTURE-1/ADR-ARCH-036-mrr-constitution.md` (pointer)
- `docs/engineering/programs/COMMERCIAL-CATALOG-ARCHITECTURE-1/FINAL-REPORT.md` (addendum: condition 1 satisfied; architecture still NOT READY)
- `docs/engineering/programs/COMMERCIAL-CATALOG-ARCHITECTURE-1/ARCHITECTURE-AUTHORITY-REVIEW.md` (registration pointer)
- `docs/engineering/programs/COMMERCIAL-ADR-REGISTRATION-1/*` (this package)

## F. Files not changed

Application code, Checkout, MRR implementation, production data, Limits enforcement, Entitlement enforcement, subscription runtime, `subscription_plans`, Constitution text (except ADR index), Architecture Constitution body.

## G. Validation

No dedicated ADR validation tool exists in the repository.

Executed:

- Registry ID scan: 001–014, 016–028, 030–036 present. Historical gaps 015 / 029 unchanged. No ID collision (each ID appears once in the index table and once in the document list).
- Cross-link check: ADR-ARCH-034 / 035 / 036 files exist; registry links resolve.
- Open-decision check: Checkout cutover remains in ADR-035; FX and refund-to-binding remain OPEN in ADR-036.
- Consistency: 034 → 035 → 036 ownership chain; 036 does not claim Check Revenue; 035 does not implement cutover.

No dedicated ADR validation tool exists. No `pnpm build` (docs-only; ceremony rebuild not required).

## H. Git state

No commit created. No push. No deploy.

Modified:

- `docs/architecture/constitution/ADR-Registry.md`

Untracked (this program + prior architecture drafts):

- `docs/architecture/adrs/ADR-ARCH-034-commercial-catalog-authority.md`
- `docs/architecture/adrs/ADR-ARCH-035-commercial-price-semantics.md`
- `docs/architecture/adrs/ADR-ARCH-036-mrr-constitution.md`
- `docs/engineering/programs/COMMERCIAL-ADR-REGISTRATION-1/`
- `docs/engineering/programs/COMMERCIAL-CATALOG-ARCHITECTURE-1/`

HEAD remains `fc4644b1` (`chore(commercial): checkpoint live plans catalog audit`).

---

**STOP.** Do not start Checkout Cutover, MRR implementation, Entitlement, Limits, or Pricing UI programs.
