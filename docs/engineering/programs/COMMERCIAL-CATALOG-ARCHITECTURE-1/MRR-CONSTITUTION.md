# MRR-CONSTITUTION.md

| Field | Value |
|-------|-------|
| **Status** | **Proposed** — not in Constitution Registry until Architecture Authority adopts ADR-ARCH-036 |
| **Domain** | Commercial recurring metric |
| **Does not own** | Check Revenue, Settlement, invoices as financial truth |

## Separation (non-negotiable)

```
Operational Financial Revenue  = SUM(Paid Check.grandTotal)     ADR-020
Commercial Recurring Revenue   = MRR (this constitution)
```

MRR MUST NOT become a second financial source of truth. It is a **SaaS recurring-revenue metric** for platform commercial health.

## Price source (normative)

MRR SHALL use **Charged Terms** on `commercial_subscription_bindings` (amount + currency + billing cycle), converted to a **monthly equivalent**.

MRR SHALL NOT use:

- current Live Plan catalog price (would rewrite history when catalog changes);
- `subscription_plans` list price (legacy; current implementation — **non-compliant with this constitution**);
- Check / Settlement totals.

Until implementation is authorized, production continues the non-compliant path. That is a **known defect**, not approved policy.

## Monthly normalization

| Cycle | Monthly equivalent |
|-------|--------------------|
| monthly | `chargedAmount` |
| yearly | `chargedAmount / 12` |

Currency: report in the **canonical commercial reporting currency (USD)** using an approved FX policy at metric time, or store charged USD. **FX policy is an additional decision** before implementation (see gate).

## Inclusion (`countsInMrr` aligned)

A subscription contributes **if and only if** all are true:

1. Account state is **ACTIVE** (not FROZEN, not NONE).
2. Commercial plan is a **paid catalog plan** (BASIC / PROFESSIONAL / ENTERPRISE), not TRIAL, not ADMIN, not NONE.
3. Charged terms exist and amount > 0.
4. Current period has not commercially ended (entitlements still enabled).

## Exclusion

| Case | MRR |
|------|-----|
| Trial | Exclude |
| FROZEN / expired entitlements | Exclude |
| NONE / never-subscribed | Exclude |
| PLATFORM_OWNER FULL_PLATFORM | Exclude |
| SIMULATED_PLAN | Exclude |
| Complimentary (charged amount 0 or flagged complimentary) | Exclude |
| Internal / test population | Exclude (existing commercialPopulation) |
| Cancelled, entitlements already off | Exclude |
| Cancelled but still ACTIVE until period end | **Include until entitlements disable** (current-state) |
| Refunded / voided such that charged terms are reversed | Exclude (requires a classified reversal event — **additional decision** on refund-to-binding) |

## Discounts / promotions

MRR reflects the **actual contracted recurring amount** (charged terms), not the public list price.

## Upgrades / downgrades / renewal

After a classified re-bind, MRR uses the **new** charged terms. It does not back-write prior periods (current-state metric).

## Historical vs current

**Current-state (point-in-time)** MRR: who is included **now**.  
Not a historical-period P&L. Historical revenue remains Check / invoices / payments.

## Implementation ban

No MRR code change until ADR-ARCH-036 is **Accepted** and the FX / refund-to-binding items below are decided.

---

## Addendum — ADR-036 Accepted; period/renewal alignment (2026-08-15)

ADR-ARCH-036 is now **Accepted** (governance). Historical findings above are unchanged.

Rev 1.1 records that MRR follows **current Charged Terms**: a catalog edit during the period does not move MRR; Renewal that writes new Charged Terms does. MRR is not cash-paid-today and not catalog-price × active customers.

FX policy and refund-to-binding remain **open**. Canonical text: [ADR-ARCH-036 rev 1.1](../../../architecture/adrs/ADR-ARCH-036-mrr-constitution.md).
