# ORDER-EVENTS-1A — Delivery Guarantees

**Program:** ORDER-EVENTS-1A — Event Infrastructure  
**Authority:** Architecture Authority  
**Status:** Active specification  

This document defines the delivery guarantees provided by the Order domain event infrastructure. It applies to publication from the transactional outbox through the relay — **not** to consumer-side processing (ORDER-EVENTS-1B and later).

---

## 1. At-least-once delivery

**Guarantee:** Every domain event persisted in `order_domain_outbox` with status `pending` will be published **at least once**, unless it is moved to `failed` (dead-letter) after exhausting retries.

**Mechanism:**

1. Events are written to the outbox in the **same database transaction** as the Order aggregate mutation (`DrizzleOrderRepository` + `DrizzleOutboxRepository.appendInTransaction`).
2. The relay (`OrderEventRelay`) fetches eligible pending rows and invokes the publisher.
3. On successful publish, `markPublished` transitions status to `published`.
4. On failure, `markPublishFailed` increments `publishAttempts`, schedules `nextRetryAt`, and leaves status `pending` until max attempts (5), then sets status `failed`.

**Implication for consumers (future):** Consumers must be **idempotent** — duplicate delivery is possible if publish succeeds but `markPublished` fails, or if a relay instance crashes after publish but before mark.

---

## 2. Idempotent publication

**Guarantee:** Publishing the same outbox row more than once does not corrupt outbox state.

**Mechanism:**

- Each event has a globally unique `eventId` (UUID) with a unique database index.
- `markPublished` uses a conditional update (`status = pending` → `published`). If another relay instance already marked the row, the update returns `false` and the relay counts the row as **skipped** (not re-published).
- The publisher (`InProcessEventPublisher` in ORDER-EVENTS-1A) performs no side-effectful consumer dispatch; ORDER-EVENTS-1B will register idempotent consumer hooks keyed on `eventId`.

---

## 3. Per-aggregate ordering

**Guarantee:** Events for a single Order aggregate are assigned **monotonic `sequenceNumber` values** at outbox append time and are relayed in `occurredAt`, then `sequenceNumber` order.

**Mechanism:**

- `appendInTransaction` reads `MAX(sequenceNumber)` for the aggregate and assigns incrementing values within the batch.
- `fetchPendingBatch` orders by `occurredAt ASC`, `sequenceNumber ASC`.

**Scope:** Ordering is guaranteed **per aggregate (orderId)**. No cross-aggregate ordering is promised.

---

## 4. No lost events on commit

**Guarantee:** If an Order mutation commits, its domain events are persisted in the outbox in the same transaction.

**Mechanism:** Single `db.transaction()` wraps order insert/update and outbox append. Rollback of either rolls back both.

**Legacy path:** When `getDb()` is unavailable (test mocks), the repository falls back to legacy `db.ts` helpers **without** outbox writes. This path is not used in production.

---

## 5. Serialization and versioning

**Guarantee:** Payloads are serialized as JSON with an explicit `payloadVersion` on the envelope and `schemaVersion` on domain event payloads.

**Compatibility:**

- **Backward:** Deserializers accept payloads with `schemaVersion ≤ envelope.payloadVersion`.
- **Forward:** Unknown JSON fields are preserved through parse/stringify; consumers should ignore unknown fields.
- **Type safety:** `deserializeDomainEventPayload` validates `payload.type === envelope.eventType`.

---

## 6. Dead-letter foundation

**Guarantee:** Events that fail publication after 5 attempts are marked `failed` with `lastError` retained. No automatic replay is implemented in ORDER-EVENTS-1A — manual or operational replay is a future concern.

---

## 7. Explicit non-guarantees (ORDER-EVENTS-1A)

| Not guaranteed | Notes |
|---|---|
| Exactly-once end-to-end delivery | Requires idempotent consumers (ORDER-EVENTS-1B+) |
| Cross-aggregate ordering | By design |
| Real-time / sub-second latency | Relay is batch-oriented |
| Consumer processing | Out of scope |
| Transport binding | Publisher is in-process only in 1A |

---

## 8. Verification

| Guarantee | Test / evidence |
|---|---|
| At-least-once / retry | `OrderEventRelay.test.ts` |
| Idempotent mark | `OrderEventRelay.test.ts` — skipped on lost race |
| Per-aggregate sequence | `DrizzleOutboxRepository.test.ts` |
| Serialization | `domainEventSerializer.test.ts` |
| Transactional append | `DrizzleOrderRepository` + migration `0044_order_domain_outbox` |

---

**Related:** [Program Charter](./Program-Charter.md) · [Architecture Traceability Matrix](./Architecture-Traceability-Matrix.md)
