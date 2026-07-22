# FINANCIAL-CORE-CAPABILITIES-ARCHITECTURE-1 — Architecture Decision Report

| Field | Value |
|---|---|
| **Status** | Accepted (architecture publication) |
| **Date** | 2026-07-23 |
| **ADR** | [ADR-ARCH-023](../../../architecture/adrs/ADR-ARCH-023-financial-core-capabilities.md) |
| **Detail** | [ARCHITECTURE.md](./ARCHITECTURE.md) |

---

## Decision

Publish a **constitutional Financial Core Capabilities Architecture** that defines the shared language, single ownership, aggregate boundaries, identities, lifecycles, invariants, and extensibility rules for Phase C — **without** redesigning certified Check, Order Settlement, Projection, API, or Presentation platforms.

---

## Key rulings

1. **Check Aggregate** remains the sole financial mutation root (Payment, Allocation, Refund, Outstanding, Tender).  
2. **Order Settlement** remains the per-Order settlement SSOT (Entity under Check).  
3. **No new monetary Aggregate Roots** (Payment/Refund are capabilities, not roots).  
4. **Outstanding Balance** is Check-owned write-model authority — never UI/Projection-owned.  
5. **Financial Timeline** is append-only history — never mutation authority.  
6. **Projection / API / Presentation / Reporting** remain read consumers.  
7. **I-FIN-*** and **I-OS-*** (including I-OS-14) remain binding; **I-FC-01…15** extend Phase C governance.  
8. Compatible with **ADR-ARCH-020 / 021 / 022**.

---

## Explicit non-decisions (deferred to successors)

- Split payment UX algorithms → SPLIT-PAYMENT-ARCHITECTURE-1  
- Cross-Check allocation rules → MULTI-CHECK-ALLOCATION-ARCHITECTURE-1  
- Balance formulas/states → OUTSTANDING-BALANCE-ARCHITECTURE-1  
- Refund domain model → REFUND-PLATFORM-ARCHITECTURE-1  
- Timeline schema/consumers → FINANCIAL-TIMELINE-ARCHITECTURE-1  

---

## Implementation authorization

**None.** This program authorizes architecture publication only.

Successor architecture programs may begin. Domain/schema/API/runtime work requires those programs’ ADRs and implementation authorizations.
