# Architecture Traceability Matrix — ORDER-EVENTS-1A

| Requirement | Blueprint § | ADR | Implementation artifact | Test / FF | Status |
|---|---|---|---|---|---|
| Transactional outbox | §8, §10 | ADR-ARCH-008 | `order_domain_outbox` + `DrizzleOutboxRepository` | FF-09, `DrizzleOutboxRepository.test.ts` | Implemented |
| Event envelope | §8, §22 | ADR-ARCH-008 | `EventEnvelope.ts` | `domainEventSerializer.test.ts` | Implemented |
| Serialization | §22 | ADR-ARCH-008 | `domainEventSerializer.ts` | `domainEventSerializer.test.ts` | Implemented |
| Outbox repository port | §10 | ADR-ARCH-008 | `EventInfrastructureContracts.ts` | `DrizzleOutboxRepository.test.ts` | Implemented |
| Event store port | §8 | ADR-ARCH-004 | `DrizzleEventStore` | — | Implemented |
| Event publisher | §8 | ADR-ARCH-008 | `InProcessEventPublisher.ts` | `InProcessEventPublisher.test.ts` | Implemented |
| Event relay | §8, §15 | ADR-ARCH-008 | `OrderEventRelay.ts` | `OrderEventRelay.test.ts` | Implemented |
| Monitoring hooks | §8 | ADR-ARCH-008 | `EventInfrastructureMetrics.ts` | Ops taxonomy | Implemented |
| Repository integration | §13 | ADR-ARCH-005, 007 | `DrizzleOrderRepository` transactional save | Integration (legacy tests) | Implemented |
| Delivery guarantees doc | §8 | ADR-ARCH-008 | `DELIVERY-GUARANTEES.md` | Review | Verified |
| Notification consumer | §12 | ADR-ARCH-004 | — | ORDER-EVENTS-1B | Out of scope |
| Session consumer | §12 | ADR-ARCH-010 | — | ORDER-EVENTS-1B | Out of scope |

---

**Compliance:** [Compliance-Checklist.md](../../governance/Compliance-Checklist.md)

**Exit report:** [Architecture-Exit-Report.md](./Architecture-Exit-Report.md)
