# SPLIT-PAYMENT-ARCHITECTURE-1 — Architecture Decision Report

| Field | Value |
|---|---|
| **Status** | Accepted (architecture publication) |
| **Date** | 2026-07-23 |
| **ADR** | [ADR-ARCH-024](../../../architecture/adrs/ADR-ARCH-024-split-payment-platform.md) |
| **Detail** | [ARCHITECTURE.md](./ARCHITECTURE.md) |

---

## Decision

Publish the **Split Payment Platform** as a Check-owned Financial Settlement capability that supports multiple Payments/Tenders against one Check, with a constitutional rule:

> **Payment Success MUST NOT automatically produce Financial Settlement.**

Financial Settlement remains exclusively owned by the Check Aggregate.

---

## Key rulings

1. **Payment** and **Tender** are not Aggregate Roots.  
2. **Payment Completion** = value received; **Financial Completion** = Check obligations satisfied via settle commands.  
3. **Order Settlement** remains per-Order settlement SSOT; allocations apply coverage through Check → OS commands.  
4. **Remaining Balance / Outstanding** is Check-owned (ADR-023).  
5. **Revenue** remains paid Check `grandTotal` (I-FIN-02); tender sums are never Revenue.  
6. **I-FIN-07** tender conservation holds at Check `paid`.  
7. **I-OS-14** preserved (no terminal OS reopen via Split Payment).  
8. Compatible with **ADR-ARCH-020 · 021 · 022 · 023**.  
9. Certified Check / OS / Projection / API / Presentation are **not redesigned**.

---

## Explicit non-decisions (deferred)

| Topic | Successor |
|-------|-----------|
| Domain state machine & commands | SPLIT-PAYMENT-DOMAIN-1 |
| Outstanding aging / balance productization | OUTSTANDING-BALANCE-ARCHITECTURE-1 |
| Cross-Check allocation | MULTI-CHECK-ALLOCATION-ARCHITECTURE-1 |
| Refund domain | REFUND-PLATFORM-ARCHITECTURE-1 |
| Timeline materialization | FINANCIAL-TIMELINE-ARCHITECTURE-1 |
| Schema / API / UI | Later implementation programs |

---

## Implementation authorization

**None.** Architecture publication only.

**SPLIT-PAYMENT-DOMAIN-1** may begin without architectural redesign.
