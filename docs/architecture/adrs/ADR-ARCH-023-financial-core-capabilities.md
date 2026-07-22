# ADR-ARCH-023: Financial Core Capabilities Architecture

> [← ADR-ARCH-020](./ADR-ARCH-020-financial-settlement-platform.md) · [← ADR-ARCH-021](./ADR-ARCH-021-EVENT-IDEMPOTENCY-GOVERNANCE.md) · [← ADR-ARCH-022](./ADR-ARCH-022-order-settlement-platform.md) · [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Owner** | Architecture Authority |
| **Program** | FINANCIAL-CORE-CAPABILITIES-ARCHITECTURE-1 |
| **Date** | 2026-07-23 |
| **Revision** | **1.0** |
| **Supersedes** | — |
| **Refines** | [ADR-ARCH-020](./ADR-ARCH-020-financial-settlement-platform.md) · [ADR-ARCH-022](./ADR-ARCH-022-order-settlement-platform.md) |
| **Related ADRs** | ADR-ARCH-001 · ADR-ARCH-002 · ADR-ARCH-006 · ADR-ARCH-014 · ADR-ARCH-020 · ADR-ARCH-021 · ADR-ARCH-022 |
| **Related programs** | FINANCIAL-CORE-CAPABILITIES-ARCHITECTURE-1 · successors: SPLIT-PAYMENT-ARCHITECTURE-1 · MULTI-CHECK-ALLOCATION-ARCHITECTURE-1 · OUTSTANDING-BALANCE-ARCHITECTURE-1 · REFUND-PLATFORM-ARCHITECTURE-1 · FINANCIAL-TIMELINE-ARCHITECTURE-1 |
| **Implementation status** | **Not implemented** — constitutional + program architecture only; no schema/API/runtime changes authorized by this ADR alone |

---

## 1. Purpose

This ADR defines the **canonical financial core language, ownership, and capability boundaries** shared by all Phase C financial platforms.

It answers, without tribal knowledge:

> Before Split Payment, Multi-Check Allocation, Refund, Outstanding Balance, and Financial Timeline programs begin — what is the shared financial vocabulary, who owns each capability, and what invariants must never be broken?

This ADR **does not redesign** certified Check, Order Settlement, Projection, API, or Presentation platforms. It **extends** the Financial Settlement Platform with a Phase C capability constitution.

---

## 2. Context (certified baseline)

Production-certified pipeline:

```
Check Aggregate
  → Order Settlement
    → Persistence
      → Projection
        → API
          → Presentation
```

Binding authorities:

| Authority | ADR / Platform |
|-----------|----------------|
| Check = sole monetary / Revenue root | ADR-ARCH-020 |
| Order Settlement = Check-owned Entity | ADR-ARCH-022 |
| Event idempotency (transport + business) | ADR-ARCH-021 / ADR-014 |
| Presentation consumes API only | ADR-ARCH-006 · ORDER-SETTLEMENT-PRESENTATION-ADOPTION-1 |
| Projection never owns business truth | ADR-ARCH-022 · ORDER-SETTLEMENT-PROJECTION-1 |

Phase C introduces advanced capabilities that **must share one language** or they will recreate dual SSOTs.

---

## 3. Decision

**The Financial Settlement Platform SHALL publish a single ubiquitous language and ownership matrix for Payment, Allocation, Outstanding Balance, Refund, Tender, Guest/Check Responsibility, and Financial Timeline — without relocating Revenue, Membership, or Order Settlement ownership.**

### Constitutional rules

1. **Check Aggregate remains** the sole financial mutation root for bill money, outcome, tenders, Order Settlement mutation authority, Payment application, Refund application, and Outstanding Balance authority.  
2. **Order Settlement remains** the SSOT for **per-Order settlement state** (not Revenue).  
3. **SettlementTransaction / Tender remains** the SSOT for **received tender lines** under Check (Payment Method Analytics unchanged).  
4. **Payment** is a **financial capability concept** describing received value intent and its allocations — not a second monetary Aggregate Root and not an ERP Invoice.  
5. **Refund** is a **first-class FSP capability** under Check authority — never owned by Order Aggregate.  
6. **Outstanding Balance** is a **Check-owned financial state** derived from certified write facts — never invented in Projection/UI.  
7. **Financial Timeline** is an **append-only historical capability** — never a mutation authority.  
8. **Projection / API / Presentation / Reporting** remain **read consumers** — zero business-rule ownership.  
9. **No Invoice. No AR/AP. No journal. No second Revenue formula. No Order-owned settlement.**  
10. Successor architecture programs **MUST** cite this ADR and **MUST NOT** redefine I-FIN-* or I-OS-* without a new ADR.

---

## 4. Critical challenges resolved

| # | Challenge | Risk if ignored | Constitutional correction |
|---|-----------|-----------------|---------------------------|
| R1 | Payment as Aggregate Root | Dual monetary root | Payment is FSP capability under Check; Tender/SettlementTransaction remains tender ledger |
| R2 | Refund owned by Order | Violates I-FIN-12 | Refund Platform owned by FSP / Check |
| R3 | Outstanding computed in UI/Projection | Dual truth | Outstanding Balance owned by Check Aggregate write model |
| R4 | Timeline as mutable ledger | History corruption | Timeline append-only; corrections via new reversing facts |
| R5 | Allocation invents money | Inflation | Allocations sum ≤ parent Payment/Refund; never create value |
| R6 | Multi-Check Allocation bypasses Membership | Composition dual SSOT | Membership remains Order→Check discovery authority |
| R7 | Split Payment redefines Revenue | Breaks Reporting | Revenue remains paid Check `grandTotal` |
| R8 | Guest Responsibility as Aggregate | ERP creep | Responsibility is allocation target concept under Check, not a person ledger |
| R9 | Redesign certified OS / Projection | Platform churn | Additive capabilities only; certified platforms preserved |
| R10 | Shared ownership of any capability | Ambiguous mutation | Exactly one owner per capability |

---

## 5. Scope

### In scope

- Shared financial language for Phase C  
- Capability ownership matrix  
- Aggregate / entity / read-model boundaries  
- Financial identity classes (conceptual)  
- Lifecycle / terminal / reversal governance  
- Global financial invariants  
- Event / read-model / reporting governance (architecture only)  
- Extensibility rules for future instruments (store credit, tips, etc.)

### Out of scope

- Schema, migrations, repositories, services, APIs, UI, projections, calculations  
- Event Bus / Outbox / Inbox design  
- Split / Multi-Check / Refund / Balance / Timeline **domain programs** (successors)  
- ERP, accounting, customer AR accounts

---

## 6. Consequences

### Positive

- Phase C programs share one vocabulary and ownership map.  
- Certified Check / Order Settlement / Projection / API / Presentation remain intact.  
- Prevents Aggregate overlap and dual Revenue.

### Costs

- Successor programs must design within this constitution (more discipline).  
- Some industry terms (Payment vs Tender) require careful MineuQR mapping.

### Follow-ons (architecture programs only until authorized)

1. SPLIT-PAYMENT-ARCHITECTURE-1  
2. MULTI-CHECK-ALLOCATION-ARCHITECTURE-1  
3. OUTSTANDING-BALANCE-ARCHITECTURE-1  
4. REFUND-PLATFORM-ARCHITECTURE-1  
5. FINANCIAL-TIMELINE-ARCHITECTURE-1  

---

## 7. Compatibility

This ADR is fully compatible with:

- ADR-ARCH-020 (Check sole monetary root; Membership; dual-metric Reporting)  
- ADR-ARCH-021 (idempotent financial command/event outcomes)  
- ADR-ARCH-022 (Order Settlement Entity; I-OS-14 terminal immutability)

Any conflict is resolved in favor of ADR-020 / ADR-022 Revenue and Aggregate rules unless Architecture Authority issues a superseding ADR.

---

## 8. Program artifact

Detailed language, matrices, diagrams, and invariants:

[FINANCIAL-CORE-CAPABILITIES-ARCHITECTURE-1 / ARCHITECTURE.md](../../engineering/programs/FINANCIAL-CORE-CAPABILITIES-ARCHITECTURE-1/ARCHITECTURE.md)
