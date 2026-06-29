# ADR-ARCH-014: Event Delivery Guarantees

> [← ADR-ARCH-013](../adrs/ADR-ARCH-013.md) · [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|---|---|
| **Status** | Accepted — Ratified |
| **Owner** | Architecture Authority |
| **Program** | ORDER-EVENTS-1B |
| **Implementation status** | Implemented |
| **Supersedes** | — |

## Context

ORDER-EVENTS-1A established transactional outbox and relay infrastructure. ORDER-EVENTS-1B introduced independent event consumers and removed inline router side-effects. A single authoritative document is required for delivery semantics across publication and consumption.

## Decision

### Transactional Outbox

All Order domain events are persisted in `order_domain_outbox` within the same database transaction as aggregate mutations (ADR-ARCH-008).

### Event Delivery Model

```
Order Aggregate → Outbox → Relay → Publisher (transport) → Consumer Registry → Consumers
```

Publication and consumption are decoupled. Consumers never bypass the outbox.

### At-least-once Delivery

The relay delivers each pending outbox event at least once unless dead-lettered after max publish attempts. Consumers must tolerate duplicate delivery.

### Idempotent Consumers

Each consumer records processed `(consumerName, eventId)` in `order_domain_consumer_processed` before marking success. Duplicate deliveries are skipped.

### Retry Strategy

- **Relay:** exponential backoff, max 5 attempts, then `failed` status on outbox row.
- **Consumers:** failure does not mark idempotency; relay retry re-attempts dispatch.

### Failed Event Handling

- Outbox `failed` status retains `lastError` (foundation for ops replay).
- Consumer failures are isolated — other consumers on the same event still execute.

### Dead-letter Strategy

Outbox rows transition to `failed` after exhausted relay attempts. Consumer-level dead-letter replay is deferred to future ops tooling.

### Event Versioning

Envelopes carry `payloadVersion`; domain payloads carry `schemaVersion`. Deserializers accept forward-compatible unknown fields.

### Consumer Registration Policy

- All consumers register declaratively in `OrderEventConsumerRegistry`.
- Publisher delegates to registry only — no hardcoded consumer list.
- Default execution policy: **parallel + isolated**.
- Consumer dependency count must be **0** (no consumer-to-consumer calls).
- Consumers may be enabled/disabled independently via registration config.

## Consequences

(+) Clear operational semantics; (+) FF-05 restored; (+) constitutional event-driven integration; (−) eventual consistency for session/notification side-effects.

## Related Blueprint Sections

§8, §12, §15, §22

## Related Programs

ORDER-EVENTS-1A, ORDER-EVENTS-1B

## Related ADRs

[ADR-ARCH-004](./ADR-ARCH-004.md) · [ADR-ARCH-008](./ADR-ARCH-008.md) · [ADR-ARCH-010](./ADR-ARCH-010.md) · [ADR-ARCH-012](./ADR-ARCH-012.md)

## Validation

Validated against ORDER-EVENTS-1B implementation: registry tests, consumer tests, router cleanup tests, idempotency store migration `0045`.

---

**Authority:** [Architecture Constitution v1.0](../constitution/Architecture-Constitution-v1.0.md) · [ADR Registry](../constitution/ADR-Registry.md)
