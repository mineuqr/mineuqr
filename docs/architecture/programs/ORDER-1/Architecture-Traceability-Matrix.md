# Architecture Traceability Matrix — ORDER-1

| Requirement | Blueprint § | ADR | Implementation artifact | Test / FF | Status |
|---|---|---|---|---|---|
| Order as core domain | §1–3 | ADR-ARCH-001 | `server/order/domain/aggregate/Order.ts` | Domain tests | Planned |
| SSOT pricing at create | §6 | ADR-ARCH-002 | `OrderPricingAdapter` → `orderPricing.ts` | FF-07, order-create-pricing.test | Planned |
| Service ownership | §2, §12 | ADR-ARCH-003 | Application ports + ACL adapters | Review | Planned |
| Production path | §13 | ADR-ARCH-005 | `PlaceOrderService`, `AdvanceOrderStatusService` | Integration tests | Planned |
| Aggregate authority | §3–7 | ADR-ARCH-007 | `Order` aggregate + policies | FF-04, FF-08 | Planned |
| Lifecycle policy | §5, §7 | ADR-ARCH-007 | `OrderLifecyclePolicy.ts` | FF-08, domain tests | Planned |
| Modification policy | §7 | ADR-ARCH-007 | `OrderModificationPolicy.ts` | Domain tests | Planned |
| Cancellation policy | §5, §7 | ADR-ARCH-007 | `OrderCancellationPolicy.ts` | Domain tests | Planned |
| Visibility policy | §7 | ADR-ARCH-003 | `OrderVisibilityPolicy.ts` | FF-11 | Planned |
| Domain events | §8 | ADR-ARCH-004 | `OrderDomainEvents.ts` + aggregate emit | Unit tests | Planned |
| Repository atomic save | §10 | ADR-ARCH-007 | `OrderRepository` + `DrizzleOrderRepository` | Integration | Planned |
| Optimistic concurrency | §10 | ADR-ARCH-011 | `save()` updatedAt check | Domain/infra tests | Planned |
| Domain errors | §23 | ADR-ARCH-007 | `OrderDomainErrors.ts` | mapOrderErrorToTrpc | Planned |
| No SQL in domain | §19 | ADR-ARCH-013 | FF-01 package layout | FF-01 | Planned |
| Event outbox | §8 | ADR-ARCH-008 | — | ORDER-EVENTS-1 | Out of scope |
| Session via events | §12 | ADR-ARCH-010 | — | ORDER-EVENTS-1 | Deferred |
| Read models | §11 | ADR-ARCH-009 | — | ORDERS-WORKSPACE-1 | Out of scope |

## Status legend

| Status | Meaning |
|---|---|
| Planned | Not started |
| In progress | Under development |
| Implemented | Code complete |
| Verified | Tested / FF green |
| Deferred | Later program |
| Out of scope | Not ORDER-1 |

---

**Compliance:** [Compliance-Checklist.md](../../governance/Compliance-Checklist.md)
