# COMMERCIAL-MRR-CHARGED-TERMS-MIGRATION-1

| Field | Value |
|-------|-------|
| **Type** | Controlled MRR source migration |
| **Date** | 2026-08-15 |
| **Authority** | Architecture Authority / Technical Design Authority |
| **Authoritative ADR** | ADR-ARCH-036 — Commercial MRR Constitution |
| **Related ADRs** | ADR-ARCH-034 · ADR-ARCH-035 (not reopened) |
| **Prior evidence** | COMMERCIAL-LIVE-PLANS-DATA-RESET-FORENSICS-1 (2026-08-14) · COMMERCIAL-SUBSCRIPTION-PLANS-CONSOLIDATION-1 |
| **Customer contracts** | **None real** — AA fact + 2026-08-14 production read-only proof |
| **SAFE DELETE `subscription_plans`** | **NO** |
| **Primary status** | See [FINAL-REPORT.md](./FINAL-REPORT.md) |

## Objective

Replace the non-compliant MRR price source:

```
subscription_plans.price  →  MRR
```

with:

```
Qualifying ACTIVE paid subscription
        ↓
Current Charged Terms
        ↓
Monthly-equivalent value
        ↓
MRR
```

## What this program did

| Action | Result |
|--------|--------|
| Forensics (MRR, Charged Terms, eligibility, consumers) | This package |
| Charged Terms sufficiency | **Sufficient** — `chargedAmount` + cycle on `commercial_subscription_bindings` |
| Canonical MRR source | **Implemented** — Charged Terms only |
| Catalog / `subscription_plans` fallback | **Not implemented** — missing terms contribute 0 |
| Eligibility | **Reused** `countsInMrr` — no second hub |
| Checkout / Live Plan prices / entitlements / Charged Terms write policy | **Unchanged** |
| Check Revenue / Order Sales | **Unchanged** |
| Table drop | **Not performed** |
| Git commit / push / deploy | **None** |

## Deliverables

| Document | Role |
|----------|------|
| [CURRENT-MRR-FORENSICS.md](./CURRENT-MRR-FORENSICS.md) | Pre-cutover MRR path and consumers |
| [CHARGED-TERMS-FORENSICS.md](./CHARGED-TERMS-FORENSICS.md) | Binding schema and sufficiency |
| [MRR-SOURCE-MIGRATION.md](./MRR-SOURCE-MIGRATION.md) | Cutover design |
| [ELIGIBILITY-MATRIX.md](./ELIGIBILITY-MATRIX.md) | `countsInMrr` reuse |
| [MONTHLY-EQUIVALENT-RULES.md](./MONTHLY-EQUIVALENT-RULES.md) | Monthly / yearly only |
| [LEGACY-DEPENDENCY-REMOVAL.md](./LEGACY-DEPENDENCY-REMOVAL.md) | What left `subscription_plans` |
| [TEST-PLAN.md](./TEST-PLAN.md) | Required cases + guard |
| [ADR-IMPACT.md](./ADR-IMPACT.md) | 034 / 035 / 036 — no automatic amend |
| [OPEN-DECISIONS.md](./OPEN-DECISIONS.md) | Remaining decisions |
| [FINAL-REPORT.md](./FINAL-REPORT.md) | A–N |

## STOP

Do not automatically start Checkout, Payment Provider, Tax, FX, Refund, Credit Note, POS, Staff Access, Inventory, or SAFE DELETE.
