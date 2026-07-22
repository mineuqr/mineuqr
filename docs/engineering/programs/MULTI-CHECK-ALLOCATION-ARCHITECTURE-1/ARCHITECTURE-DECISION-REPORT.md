# MULTI-CHECK-ALLOCATION-ARCHITECTURE-1 — Architecture Decision Report

| Field | Value |
|---|---|
| **Status** | Accepted (architecture publication) |
| **Date** | 2026-07-23 |
| **ADR** | [ADR-ARCH-025](../../../architecture/adrs/ADR-ARCH-025-multi-check-allocation-platform.md) |
| **Detail** | [ARCHITECTURE.md](./ARCHITECTURE.md) |

---

## Decision

Publish the **Multi Check Allocation Platform** as a Check-commanded Financial Settlement capability that records the relationship between financial value and Check responsibility across Checks, with constitutional rules:

> **Allocation is not an Aggregate Root. Allocation is not a Payment. Allocation is not a Check.**  
> **Check Aggregate remains the sole mutation authority.**  
> **Allocated Value + Remaining Value = Financial Responsibility.**

---

## Key rulings

1. **Multi Check Allocation** is an FSP capability under Check Aggregate commands — no new Aggregate Root.  
2. **Canonical identities** (AllocationId, AllocationReference, FinancialReference, SourcePaymentId, SourceCheckId, TargetCheckId, AllocationSequence, …) are stable; persistence ids never replace them.  
3. **Allocation model** includes Portion, Source, Target, Responsibility, Remaining, Completion, Adjustment, Reversal; supports 1:1, 1:N, N:1, N:N.  
4. **Lifecycle:** Pending → Reserved → Applied → Adjusted → Reversed / Completed / Cancelled; terminals do not regress.  
5. **Payments reference Allocations; Payments do not own Allocations.** Split Payment remains independent. Payment Completion ≠ Allocation Completion.  
6. **Checks own** Outstanding, Settlement completion, and Financial completion. Allocation only redistributes responsibility.  
7. **Order Settlement** remains SSOT; Allocation never owns it. Membership remains sole Order↔Check composition discovery.  
8. **Revenue unchanged** (I-FIN-02); Allocation is traceability, not revenue ownership.  
9. **Conservation** I-MCA-* extends ADR-023 / ADR-024 without contradiction.  
10. Compatible with **ADR-ARCH-020 · 021 · 022 · 023 · 024**.  
11. Certified Check / OS / Split Payment / Projection / API / Presentation are **not redesigned**.

---

## Explicit non-decisions (deferred)

| Topic | Successor |
|-------|-----------|
| Domain state machine & commands | MULTI-CHECK-ALLOCATION-DOMAIN-1 |
| Cross-Check coordination/saga mechanics detail | MULTI-CHECK-ALLOCATION-DOMAIN-1 |
| Outstanding aging / balance productization | OUTSTANDING-BALANCE-ARCHITECTURE-1 |
| Refund domain | REFUND-PLATFORM-ARCHITECTURE-1 |
| Timeline materialization | FINANCIAL-TIMELINE-ARCHITECTURE-1 |
| Schema / API / UI / Projection | Later implementation programs |

---

## Implementation authorization

**None.** Architecture publication only.

**MULTI-CHECK-ALLOCATION-DOMAIN-1** may begin without architectural redesign.

---

## Architecture Report (program exit)

| Deliverable | Artifact | Status |
|-------------|----------|--------|
| ADR-ARCH-025 | `docs/architecture/adrs/ADR-ARCH-025-multi-check-allocation-platform.md` | Accepted |
| Ownership Model | ARCHITECTURE.md §5 | Published |
| Allocation Model | ARCHITECTURE.md §7 | Published |
| Canonical Identities | ARCHITECTURE.md §6 | Published |
| Lifecycle | ARCHITECTURE.md §8 | Published |
| Aggregate Boundaries | ARCHITECTURE.md §10 | Published |
| Domain Relationships | ARCHITECTURE.md §11 | Published |
| Financial Conservation Rules | ARCHITECTURE.md §9 | Published |
| Global Invariants | ARCHITECTURE.md §9.4 · §14 | Published |
| Architecture Decision Report | This document | Accepted |

**Program certification:** MULTI-CHECK-ALLOCATION-ARCHITECTURE-1 is production-certified as **constitutional architecture** (no runtime implementation authorized by this program).
