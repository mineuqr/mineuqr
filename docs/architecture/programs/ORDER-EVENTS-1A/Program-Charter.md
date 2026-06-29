# Program Charter — ORDER-EVENTS-1A

| Field | Value |
|---|---|
| **Program** | ORDER-EVENTS-1A — Event Infrastructure |
| **Type** | Implementation |
| **Authority** | Architecture Authority |
| **Constitution version** | 1.0.0 |
| **Prerequisite** | ORDER-1 (certified) |
| **Start date** | 2026-06-27 |
| **Target exit** | ORDER-EVENTS-1A exit review |

## Mission

Build **reliable event publication infrastructure** for the Order bounded context: transactional outbox, canonical event envelope, publisher, relay, serialization, and monitoring hooks — **without implementing consumers**.

## Program objectives

1. Persist Order domain events in the **same database transaction** as aggregate mutations (ADR-ARCH-008).
2. Provide transport-agnostic **event envelope** and serialization with versioning.
3. Implement **outbox-driven publication** — no direct event publishing from services.
4. Implement **relay** with retry, failure tracking, and dead-letter foundation.
5. Document and test **delivery guarantees** (at-least-once, idempotent publication, per-aggregate ordering).
6. Expose **infrastructure telemetry** only (no business metrics).

## Scope

| In scope | Out of scope |
|---|---|
| Transactional outbox table + repository | Notification consumer |
| Event envelope + serialization | Session consumer |
| Event publisher (infrastructure) | Kitchen / Printing consumers |
| Event relay process | Analytics / read models |
| Infrastructure interfaces | UI / Dashboard |
| Monitoring hooks | Inline router side-effect removal (ORDER-EVENTS-1B) |
| Unit/integration tests (infra only) | Projections |

## Constitutional references

- [Architecture Constitution v1.0](../../constitution/Architecture-Constitution-v1.0.md) §8, §13, §19–20, §22, §28
- [Compliance §28](../../constitution/Compliance.md)
- [ORDER-1 Exit Report](../ORDER-1/Architecture-Exit-Report.md) — CV-01–04 remediation path

## Blueprint references

| § | Subject |
|---|---|
| §8 | Domain Events Architecture |
| §10 | Repository Architecture (outbox atomic with commit) |
| §15 | Event publication sequence |
| §22 | Domain versioning (event schema) |

## Applicable ADRs

| ADR | Role in 1A |
|---|---|
| ADR-ARCH-004 | Event-driven integration foundation |
| ADR-ARCH-008 | **Primary** — Order Outbox and Event Relay |
| ADR-ARCH-007 | Events originate from aggregate only |
| ADR-ARCH-005 | Production path (outbox on mutation path) |
| ADR-ARCH-011 | Aggregate version in envelope |

**Deferred to ORDER-EVENTS-1B:** ADR-ARCH-010 (session via events), consumer migration.

## Architecture Traceability Matrix

See [Architecture-Traceability-Matrix.md](./Architecture-Traceability-Matrix.md).

## Entry criteria

- [x] ORDER-1 certified (PASS WITH DEFERRED ITEMS)
- [x] Order aggregate operational
- [x] Domain events defined (`OrderDomainEvents.ts`)
- [x] Program charter approved

## Exit criteria

- [ ] `order_domain_outbox` table + migration
- [ ] Events persisted atomically with order save (when DB available)
- [ ] Envelope, serializer, interfaces implemented
- [ ] Publisher + relay operational (in-process)
- [ ] Delivery guarantees documented
- [ ] Infrastructure tests pass
- [ ] FF-09 satisfied (outbox same transaction)
- [ ] No consumer implementations
- [ ] Architecture Exit Report delivered

## Risks

| Risk | Mitigation |
|---|---|
| Test mocks bypass `getDb()` | Legacy save path when DB unavailable; outbox tests separate |
| Relay runaway retries | Exponential backoff + max attempts → failed state |
| Event schema drift | `payloadVersion` + forward-compatible deserialization |

## Out of scope

All consumers, projections, read models, session/notification migration, kitchen, printing, analytics, UI.

## Certification target

**Certified** upon infrastructure completion; consumer migration remains ORDER-EVENTS-1B.

---

**Certification:** [Program-Certification.md](../../governance/Program-Certification.md)
