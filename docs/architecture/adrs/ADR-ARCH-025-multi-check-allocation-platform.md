# ADR-ARCH-025: Multi Check Allocation Platform

> [← ADR-ARCH-020](./ADR-ARCH-020-financial-settlement-platform.md) · [← ADR-ARCH-021](./ADR-ARCH-021-EVENT-IDEMPOTENCY-GOVERNANCE.md) · [← ADR-ARCH-022](./ADR-ARCH-022-order-settlement-platform.md) · [← ADR-ARCH-023](./ADR-ARCH-023-financial-core-capabilities.md) · [← ADR-ARCH-024](./ADR-ARCH-024-split-payment-platform.md) · [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Owner** | Architecture Authority |
| **Program** | MULTI-CHECK-ALLOCATION-ARCHITECTURE-1 |
| **Date** | 2026-07-23 |
| **Revision** | **1.0** |
| **Supersedes** | — |
| **Refines** | [ADR-ARCH-023](./ADR-ARCH-023-financial-core-capabilities.md) · [ADR-ARCH-020](./ADR-ARCH-020-financial-settlement-platform.md) · [ADR-ARCH-024](./ADR-ARCH-024-split-payment-platform.md) |
| **Related ADRs** | ADR-ARCH-020 · ADR-ARCH-021 · ADR-ARCH-022 · ADR-ARCH-023 · ADR-ARCH-024 |
| **Related programs** | MULTI-CHECK-ALLOCATION-ARCHITECTURE-1 · MULTI-CHECK-ALLOCATION-DOMAIN-1 (successor) · OUTSTANDING-BALANCE-ARCHITECTURE-1 · FINANCIAL-TIMELINE-ARCHITECTURE-1 |
| **Implementation status** | **Not implemented** — constitutional + program architecture only; no schema/API/runtime changes authorized by this ADR alone |

---

## 1. Purpose

This ADR defines the **Multi Check Allocation Platform** — the constitutional capability that redistributes financial value and Check responsibility **across one or more Checks** without violating Financial Conservation.

It answers:

> How does MineuQR allocate value across Checks (one Payment → many Checks, many Payments → one Check, Order moves, Check merge/split) — without making Allocation an Aggregate Root, without relocating Outstanding / Order Settlement / Revenue ownership, and without inventing or destroying money?

---

## 2. Context

Certified baseline:

- Check = sole monetary / Revenue root (ADR-020)  
- Order Settlement = Check-owned per-Order settlement SSOT (ADR-022)  
- Payment / Tender / Payment Allocation = Check-owned Split Payment capability (ADR-024)  
- ADR-023 names Allocation, Outstanding, Guest/Check Responsibility, and defers Multi-Check Allocation  

**Gap:** Split Payment constitutionalizes multiple Payments against a **single** Check. Cross-Check redistribution of responsibility and funded value is not yet constitutionalized.

---

## 3. Decision

**The Financial Settlement Platform SHALL include Multi Check Allocation as a Check-commanded capability that records the relationship between financial value and Check responsibility across Checks.**

### Constitutional rules

1. **Allocation is not an Aggregate Root.** Allocation is not a Payment. Allocation is not a Check.  
2. **Allocation represents only** the relationship between financial value and Check responsibility.  
3. **Check Aggregate** remains the sole financial mutation authority. Allocation records are created, updated, and finalized **only** through Check commands.  
4. **No external component** may mutate Allocation directly (Projection, API, Presentation, Reporting, Order Aggregate, Session).  
5. **Membership** remains the sole Order↔Check composition discovery authority (I-FC-14 / I-FIN-06). Allocation MUST NOT invent a second composition SSOT.  
6. **Financial Conservation (ADR-023)** holds for every Allocation operation set:  
   `Allocated Value + Remaining Value = Financial Responsibility`  
   Allocation MUST NEVER create, destroy, or duplicate value; MUST NEVER allocate beyond responsibility or payment value; MUST NEVER produce negative responsibility.  
7. **Outstanding Balance** remains owned by the Check Aggregate. Allocation MAY redistribute Outstanding; ownership never leaves Check.  
8. **Order Settlement** remains per-Order settlement SSOT. Allocation MAY influence which Check is responsible; Allocation MUST NEVER own Order Settlement.  
9. **Payments do not own Allocations.** Split Payment remains independent. Payment Completion NEVER implies Allocation Completion. Allocation Completion NEVER implies Check Financial Settlement.  
10. **Revenue unchanged** (I-FIN-02). Allocation provides traceability, not revenue ownership.  
11. **Canonical Allocation identities** are stable for the lifecycle; persistence identifiers MUST NEVER replace them.  
12. **ADR-021** idempotency applies to Allocation reserve/apply/adjust/reverse/cancel/complete.  
13. **I-OS-14 preserved:** Multi Check Allocation must not reopen terminal Order Settlement to non-terminal.  
14. **No redesign** of certified Check, Order Settlement, Split Payment, Projection, API, or Presentation platforms — additive successors only.

---

## 4. Critical challenges resolved

| # | Challenge | Correction |
|---|-----------|------------|
| R1 | Allocation Aggregate Root | Allocation is a Check-commanded relationship fact — not a root |
| R2 | Payment owns cross-Check funding | Payments reference Allocations; Checks mutate Allocations |
| R3 | Dual Order↔Check composition via Allocation | Membership remains sole composition SSOT |
| R4 | Allocation invents / destroys money | Conservation laws I-MCA-* / I-FC-* |
| R5 | Allocation owns Outstanding | Outstanding remains Check-owned |
| R6 | Allocation owns Order Settlement | OS remains Check-owned Entity |
| R7 | Payment Completion ⇒ Allocation Completion | Forbidden — independent lifecycles |
| R8 | Allocation Completion ⇒ Check settled | Forbidden — Financial Completion remains Check settle |
| R9 | Persistence id as business identity | Canonical Allocation identities required |
| R10 | Redesign certified Split Payment / OS | Additive capability only |

---

## 5. Scope

**In:** Multi Check Allocation language, ownership, canonical identities, allocation model, lifecycle, aggregate boundaries, domain relationships, conservation, invariants, events (names only), reporting impact (architecture only).

**Out:** Implementation, schema, repositories, domain state machines, Event Bus, Refund domain detail, Outstanding productization, UI/API/Projection code.

---

## 6. Consequences

### Positive

- Cross-Check funding, Order moves, merge/split become expressible without a second monetary root.  
- Certified Split Payment, Order Settlement, and Revenue semantics remain intact.  
- MULTI-CHECK-ALLOCATION-DOMAIN-1 can proceed without architectural redesign.

### Costs

- Cross-Check operations require coordinated Check Aggregate commands (no Allocation Root to “own” the saga).  
- Domain program must enforce conservation across multi-Check allocation sets.

---

## 7. Compatibility

Compatible with ADR-ARCH-020, ADR-ARCH-021, ADR-ARCH-022, ADR-ARCH-023, ADR-ARCH-024.

Any conflict is resolved in favor of ADR-020 / ADR-022 Revenue and Aggregate rules, ADR-023 conservation, and ADR-024 Payment Finality unless Architecture Authority issues a superseding ADR.

---

## 8. Program artifact

Detailed ownership, identities, lifecycle, relationships, and invariants:

[MULTI-CHECK-ALLOCATION-ARCHITECTURE-1 / ARCHITECTURE.md](../../engineering/programs/MULTI-CHECK-ALLOCATION-ARCHITECTURE-1/ARCHITECTURE.md)
