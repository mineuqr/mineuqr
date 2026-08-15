# COMMERCIAL-SUBSCRIPTION-PLANS-CONSOLIDATION-1

| Field | Value |
|-------|-------|
| **Type** | Consolidation (forensics + limited Checkout price-source implementation) |
| **Date** | 2026-08-15 |
| **Authority** | Architecture Authority / Technical Design Authority |
| **Prior evidence** | COMMERCIAL-LIVE-PLANS-DATA-RESET-FORENSICS-1 (2026-08-14) · ADR-ARCH-034 / 035 / 036 |
| **Customer contracts** | **None real** — AA fact + 2026-08-14 production read-only proof |
| **SAFE DELETE** | **NO** |
| **Primary status** | **SUBSCRIPTION PLANS CONSOLIDATION — BLOCKED** |

## Objective

One commercial catalog. One plan authority. One sellable plan model: **Live Plans**.

`subscription_plans` must not remain a competing commercial price book.

## What this program did

| Action | Result |
|--------|--------|
| Forensics + field ownership + sequence | This package |
| Checkout price source | **Implemented** — Live Plan Offer List Price |
| `legacyPlanId` | Retained as **LEGACY COMPATIBILITY IDENTIFIER** only |
| MRR | **Not implemented** (ADR-036 gated) |
| Table drop | **Not performed** |
| FX / Tax / Provider / Refund | **Not implemented** |
| Git commit / push | **None** |

## Deliverables

| Document | Role |
|----------|------|
| [FORENSIC-REPORT.md](./FORENSIC-REPORT.md) | Dependency re-verification |
| [FIELD-OWNERSHIP-MATRIX.md](./FIELD-OWNERSHIP-MATRIX.md) | Field → owner / action |
| [LIVE-PLAN-CONSOLIDATION-MAP.md](./LIVE-PLAN-CONSOLIDATION-MAP.md) | Live Plan completeness |
| [CHECKOUT-CONSOLIDATION.md](./CHECKOUT-CONSOLIDATION.md) | Cutover decision + what shipped |
| [SUBSCRIPTION-BINDING-CONSOLIDATION.md](./SUBSCRIPTION-BINDING-CONSOLIDATION.md) | Bind path |
| [MRR-DEPENDENCY.md](./MRR-DEPENDENCY.md) | Why MRR stays gated |
| [ENTITLEMENT-DEPENDENCY.md](./ENTITLEMENT-DEPENDENCY.md) | Already consolidated |
| [ADMIN-API-CONSOLIDATION.md](./ADMIN-API-CONSOLIDATION.md) | Admin / API residuals |
| [DATABASE-CONSOLIDATION.md](./DATABASE-CONSOLIDATION.md) | Schema / FKs |
| [TEST-SEED-CONSOLIDATION.md](./TEST-SEED-CONSOLIDATION.md) | Fixtures / seeds |
| [MIGRATION-SEQUENCE.md](./MIGRATION-SEQUENCE.md) | Phases A–I |
| [SAFE-DELETE-ASSESSMENT.md](./SAFE-DELETE-ASSESSMENT.md) | 20-condition gate |
| [ADR-IMPACT.md](./ADR-IMPACT.md) | No automatic ADR edit |
| [OPEN-DECISIONS.md](./OPEN-DECISIONS.md) | Remaining decisions |
| [FINAL-REPORT.md](./FINAL-REPORT.md) | A–O |

## STOP

Do not automatically start MRR implementation, Payment Provider, Tax, FX, Refund, POS, or SAFE DELETE.
