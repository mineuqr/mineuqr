# ADR-ARCH-024: Split Payment Platform

> [← ADR-ARCH-020](./ADR-ARCH-020-financial-settlement-platform.md) · [← ADR-ARCH-021](./ADR-ARCH-021-EVENT-IDEMPOTENCY-GOVERNANCE.md) · [← ADR-ARCH-022](./ADR-ARCH-022-order-settlement-platform.md) · [← ADR-ARCH-023](./ADR-ARCH-023-financial-core-capabilities.md) · [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Owner** | Architecture Authority |
| **Program** | SPLIT-PAYMENT-ARCHITECTURE-1 |
| **Date** | 2026-07-23 |
| **Revision** | **1.0** |
| **Supersedes** | — |
| **Refines** | [ADR-ARCH-023](./ADR-ARCH-023-financial-core-capabilities.md) · [ADR-ARCH-020](./ADR-ARCH-020-financial-settlement-platform.md) · [ADR-ARCH-022](./ADR-ARCH-022-order-settlement-platform.md) |
| **Related ADRs** | ADR-ARCH-020 · ADR-ARCH-021 · ADR-ARCH-022 · ADR-ARCH-023 · ADR-ARCH-025 |
| **Related programs** | SPLIT-PAYMENT-ARCHITECTURE-1 · SPLIT-PAYMENT-DOMAIN-1 (successor) · MULTI-CHECK-ALLOCATION-ARCHITECTURE-1 · OUTSTANDING-BALANCE-ARCHITECTURE-1 · FINANCIAL-TIMELINE-ARCHITECTURE-1 |
| **Implementation status** | **Not implemented** — constitutional + program architecture only; no schema/API/runtime changes authorized by this ADR alone |
| **Refined by** | [ADR-ARCH-037](./ADR-ARCH-037-payment-process-domain.md) — Cashier Mixed (تسوية) is cash+network collection at Confirm Payment, persisted as SettlementTransaction lines. It is **not** this Split Payment capability. Payment Finality ≠ Settlement Finality remains law for incremental FSP Payments. Cashier Confirm MAY atomically collect and settle in the certified Check TX **until ADR-ARCH-039 Cashier adoption**. |
| **Amended by** | [ADR-ARCH-039](./ADR-ARCH-039-payment-collection-financial-authority.md) — Payment Success ≠ Settlement **retained**. Collection Fact supplies the missing collection identity. Cashier atomic Check settle remains **runtime** until adoption certification. |

---

## 1. Purpose

This ADR defines the **Split Payment Platform** — multiple financial transactions (Payments / Tenders) against a **single Check**, with constitutional separation between **Payment Success** and **Financial Settlement**.

It answers:

> How does MineuQR accept Cash+Visa, incremental guest payments, and deferred completion on one Check — without making Payment an Aggregate Root, without auto-settling the Check on payment success, and without changing Revenue or Order Settlement ownership?

---

## 2. Context

Certified baseline:

- Check = sole monetary / Revenue root (ADR-020)  
- Order Settlement = Check-owned per-Order settlement SSOT (ADR-022)  
- SettlementTransaction = tender ledger under Check (I-FIN-07)  
- ADR-023 names Payment, Tender, Allocation, Outstanding  

**Gap:** atomic multi-tender at settle exists; **incremental Payments**, explicit Payment lifecycle, and **Payment Finality ≠ Settlement Finality** are not yet constitutionalized.

---

## 3. Decision

**The Financial Settlement Platform SHALL include Split Payment as a Check-owned capability.**

### Constitutional rules

1. **Check Aggregate** is the only financial mutation authority.  
2. **Payment is not an Aggregate Root.** Tender is not an Aggregate Root.  
3. **Payment Success MUST NOT automatically produce Financial Settlement.**  
4. **Financial Settlement** (Check outcome / Order Settlement terminal coverage per settle rules) remains exclusively Check Aggregate authority.  
5. **Payment Completion** only confirms value received via approved Tender(s).  
6. **Order Settlement** remains per-Order settlement SSOT; Payments allocate coverage into OS — they do not replace OS.  
7. **Revenue unchanged:** paid Check `grandTotal` (I-FIN-02). Tender/Payment sums are never Revenue.  
8. **Conservation (ADR-023):** Allocated + Remaining Balance = Financial Responsibility; allocations ≤ Payment; applied Payments ≤ Outstanding.  
9. **I-OS-14 preserved:** Split Payment must not reopen terminal OS to non-terminal.  
10. **ADR-021** idempotency applies to Payment apply/allocate/cancel/fail.  
11. **No redesign** of certified Check, Order Settlement, Projection, API, or Presentation platforms — additive successors only.

---

## 4. Critical challenges resolved

| # | Challenge | Correction |
|---|-----------|------------|
| R1 | Payment Aggregate Root | Payment under Check |
| R2 | Payment success auto-settles Check | **Forbidden** — Payment Finality ≠ Settlement Finality |
| R3 | Remaining balance in UI | Check-owned Outstanding |
| R4 | Revenue = tender sum | Forbidden (I-FIN-02) |
| R5 | Bypass Order Settlement | Allocations target OS |
| R6 | Redesign SettlementTransaction | Tender ledger remains analytics SSOT |

---

## 5. Scope

**In:** Split Payment language, ownership, lifecycle, **Payment Finality Governance**, allocation, read/API/presentation/reporting impact, events (names only).  

**Out:** Implementation, schema, Multi-Check Allocation, Refund domain detail, Event Bus, PSP gateway design.

---

## 6. Consequences

Enables incremental and multi-tender workflows; preserves certified platforms; requires SPLIT-PAYMENT-DOMAIN-1 for domain commands.

---

## 7. Compatibility

Compatible with ADR-ARCH-020, ADR-ARCH-021, ADR-ARCH-022, ADR-ARCH-023.

**Program artifact:** [ARCHITECTURE.md](../../engineering/programs/SPLIT-PAYMENT-ARCHITECTURE-1/ARCHITECTURE.md)
