# Program Charter — ORDER-1

| Field | Value |
|---|---|
| **Program** | ORDER-1 — Order Domain Implementation |
| **Type** | Implementation |
| **Authority** | Architecture Authority |
| **Constitution version** | 1.0.0 |
| **Start date** | 2026-06-27 |
| **Target exit** | ORDER-1 exit review |

## Mission

Extract and implement the **Order Core Domain** as the single authoritative mutation path for order state, per Architecture Constitution v1.0 and the Order-Centric Blueprint. Replace router-centric order mutations with Aggregate → Policies → Repository → Events → Application orchestration.

## Program scope

Implement only the Order bounded context foundation:

- Order Aggregate and OrderLine entity
- Domain policies (lifecycle, modification, cancellation, visibility)
- Domain services via ports (pricing, order number, tracking token)
- Repository interface and Drizzle implementation
- Application command handlers (PlaceOrder, AdvanceOrderStatus, CancelOrder)
- Domain events (emit after commit; no consumers)
- Domain error model

## Objectives

1. Order Aggregate becomes the **sole mutation authority** for `orders` / `order_items`.
2. All order create and status mutations route through application services.
3. Domain invariants and lifecycle policies enforced server-side.
4. Domain events collected and returned after successful persistence.
5. Repository prepared for optimistic concurrency (ADR-ARCH-011).
6. Architecture traceability and fitness functions satisfied for in-scope items.

## Constitutional references

- [Architecture Constitution v1.0](../../constitution/Architecture-Constitution-v1.0.md)
- [North Star](../../constitution/North-Star.md)
- [Compliance §28](../../constitution/Compliance.md)
- [Package Architecture §20](../../constitution/Governance.md)

## Blueprint references

| Section | Subject |
|---|---|
| §3 | Order Aggregate Blueprint |
| §4 | Domain Model |
| §5 | Order Lifecycle Architecture |
| §6 | Business Invariants |
| §7 | Policy Architecture |
| §8 | Domain Events Architecture |
| §9 | Service Architecture |
| §10 | Repository Architecture |
| §13 | Production Path |
| §14 | Architectural Constraints |
| §23 | Domain Error Architecture |

## Applicable ADRs

ADR-ARCH-001, 002, 003, 005, 007 (primary); 004, 008, 010, 011 (partial — events/outbox/session deferred).

**Not in scope:** ADR-ARCH-006 (read models), ADR-ARCH-009 (dashboard analytics), ADR-ARCH-012 (kitchen/print).

## Architecture Traceability Matrix

See [Architecture-Traceability-Matrix.md](./Architecture-Traceability-Matrix.md).

## Entry criteria

- [x] Constitution v1.0 ratified and published (ARCH-CONSTITUTION-1)
- [x] RESET-1 baseline clean (no printing runtime)
- [x] ARCH-1A.1 Order audit complete
- [x] Program charter approved (this document)
- [x] Entry architecture review — scope aligned with §25 evolution rules

## Exit criteria

- [ ] Order Aggregate is sole mutation path for create and status changes
- [ ] Policies operational with unit tests (FF-08)
- [ ] Application services contain no business rules
- [ ] Domain events emitted after repository commit
- [ ] Repository interface isolates domain from Drizzle
- [ ] Existing order integration tests pass
- [ ] Domain unit tests for aggregate and policies
- [ ] Implementation report and compliance matrix delivered
- [ ] ATM rows marked Implemented + Verified

## Risks

| Risk | Mitigation |
|---|---|
| Router monolith resists extraction | Strangler: wire create/update first; queries unchanged |
| Session/notification inline coupling remains in router | Documented deferred to ORDER-EVENTS-1 (ADR-004, ADR-010) |
| Test mocks target `db.ts` directly | Repository delegates to existing db helpers during transition |
| Optimistic concurrency UI not ready | Repository enforces; map ConcurrencyConflict to 409 |

## Out of scope

Kitchen, Printing, Session redesign, Notifications implementation, Dashboard redesign, Analytics/read models, Outbox relay (ORDER-EVENTS-1), Event consumers, Commercial redesign, new ADRs, architectural redesign.

## Compliance

- Entry review: Complete
- Exit review: Pending
- ATM: [Architecture-Traceability-Matrix.md](./Architecture-Traceability-Matrix.md)

## Certification target

Certified (conditionally certified acceptable only for documented ORDER-EVENTS-1 deferrals on inline session/notification integration).

---

**Certification:** [Program-Certification.md](../../governance/Program-Certification.md)
