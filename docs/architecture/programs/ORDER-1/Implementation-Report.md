# ORDER-1 — Implementation Report

**Program:** ORDER-1 — Order Domain Implementation  
**Constitution:** v1.0.0  
**Date:** 2026-06-27  
**Status:** Exit review pending

---

## Executive summary

ORDER-1 establishes the **Order bounded context** under `server/order/` with aggregate, policies, domain events, repository, and application services. Order **create** and **status update** mutations now flow through the certified production path. Queries (`list`, `getById`, `getPublicStatus`) remain on existing read paths (read models deferred).

---

## Implemented components

| Component | Path |
|---|---|
| Order Aggregate | `server/order/domain/aggregate/Order.ts` |
| OrderLine entity | `server/order/domain/aggregate/OrderLine.ts` |
| Value objects | `server/order/domain/value-objects/` |
| Policies | `server/order/domain/policies/` |
| Domain events | `server/order/domain/events/OrderDomainEvents.ts` |
| Domain errors | `server/order/domain/errors/OrderDomainErrors.ts` |
| Ports | `server/order/domain/ports/OrderPorts.ts` |
| Repository interface | `server/order/repositories/OrderRepository.ts` |
| Drizzle repository | `server/order/infrastructure/persistence/` |
| Infrastructure adapters | `server/order/infrastructure/adapters/` |
| PlaceOrderService | `server/order/application/PlaceOrderService.ts` |
| AdvanceOrderStatusService | `server/order/application/AdvanceOrderStatusService.ts` |
| Error mapping | `server/order/application/mapOrderDomainError.ts` |
| Composition | `server/order/composition.ts`, `placeOrderComposition.ts` |
| Router integration | `server/routers.ts` (`order.create`, `order.updateStatus`) |
| Domain tests | `server/order/domain/__tests__/orderDomain.test.ts` |

---

## Remaining work (deferred programs)

| Item | Program | ADR |
|---|---|---|
| Transactional outbox + relay | ORDER-EVENTS-1 | ADR-ARCH-008 |
| Remove inline session/notification from router | ORDER-EVENTS-1 | ADR-ARCH-004, ADR-ARCH-010 |
| Server read models / dashboard KPIs | ORDERS-WORKSPACE-1 | ADR-ARCH-009 |
| ACL modules (Commercial, Restaurant, Identity) | ORDER-1B or ORDER-2 | §21 |
| Formal `server/order/application/commands/` package split | Optional cleanup | §20 |
| Retire `TABLE_SESSION_DUAL_WRITE` | ORDER-EVENTS-1 | ADR-ARCH-005 |

---

## Compliance matrix

| Requirement | Status | Evidence |
|---|---|---|
| Aggregate sole mutation authority (create/update) | **Implemented** | Router delegates to application services |
| Lifecycle policy | **Verified** | Domain tests + FF-08 |
| Modification policy (immutable lines) | **Implemented** | `OrderModificationPolicy` |
| Domain events after commit | **Partial** | Events emitted post-repository save; no outbox table yet |
| Repository boundaries | **Implemented** | Interface in domain layer; Drizzle in infrastructure |
| No business rules in application | **Implemented** | Rules in aggregate/policies only |
| Optimistic concurrency | **Implemented** | `updatedAt` check on save |
| Production path | **Partial** | Core path certified; integration side effects remain in router |

---

## Affected ADRs

| ADR | Implementation status |
|---|---|
| ADR-ARCH-001 | Partial → In progress (domain extracted) |
| ADR-ARCH-002 | Partial (pricing via port; client KPIs unchanged) |
| ADR-ARCH-003 | Partial (gates still in router adapter) |
| ADR-ARCH-004 | Not implemented (consumers deferred) |
| ADR-ARCH-005 | Partial (dual-write path still exists) |
| ADR-ARCH-006 | Not implemented |
| ADR-ARCH-007 | **Implemented** (aggregate + policies) |
| ADR-ARCH-008 | Deferred |
| ADR-ARCH-009 | Deferred |
| ADR-ARCH-010 | Deferred |
| ADR-ARCH-011 | **Implemented** (optimistic lock) |

---

## Affected Blueprint sections

§3, §4, §5, §6, §7, §8 (events only), §9, §10, §13, §14, §23

---

## Fitness function verification

| FF | Result |
|---|---|
| FF-01 No SQL in domain | **Pass** |
| FF-04 Mutations via application service | **Pass** (create/update) |
| FF-05 No notification in router | **Fail** — deferred ORDER-EVENTS-1 |
| FF-07 Client price ignored | **Pass** (existing + PlaceOrderService) |
| FF-08 Lifecycle server-side | **Pass** |
| FF-09 Outbox same transaction | **Fail** — ORDER-EVENTS-1 |

---

## Known limitations

1. Session, notification, and push side effects remain **inline in `orderRouter`** (pre-existing; ORDER-EVENTS-1).
2. Restaurant/commercial/table **gates** remain in router (adapter layer); ACL packages not yet extracted.
3. **No outbox table** — events returned in-process only, not persisted for relay.
4. Repository create/update uses existing `db.ts` helpers (transition compatibility).

---

## Architecture exceptions

None filed. Inline integration side effects documented as **conditional certification** debt per Program Charter.

---

## Test results

- `npm run check` — **PASS**
- Order domain tests — **7/7 PASS**
- Order integration tests — **43/43 PASS** (pricing, tracking, session dual-write, status, public status)

---

## Exit review

### Decision: **PASS WITH DEFERRED ITEMS**

**Rationale:** Core Order domain foundation is implemented and verified. Aggregate, policies, repository, application services, and domain events meet ORDER-1 scope. Deferred items (outbox, event consumers, ACL extraction, read models) are explicitly assigned to follow-on programs and do not block ORDER-1 domain certification.

**Conditions:**

1. ORDER-EVENTS-1 must retire inline session/notification coupling.
2. ORDERS-WORKSPACE-1 must address ADR-ARCH-006/009.
3. Update ADR Registry implementation status at Architecture Authority exit sign-off.

---

**Next program:** ORDER-EVENTS-1 (recommended) or continue ORDER-1B (ACL extraction).
