# ORDERS-READ-MODEL-1 Phase 3B — Idempotency Verification

**Date:** 2026-06-29

---

## Mechanisms

| Layer | Implementation | Key |
|-------|----------------|-----|
| Projection consumer dispatch | `DrizzleProjectionConsumerIdempotencyStore` | `(consumerName, eventId)` |
| Integration consumer dispatch | `DrizzleConsumerIdempotencyStore` | `(consumerName, eventId)` |
| Projection persistence | Drizzle `onDuplicateKeyUpdate` upserts | `(restaurantId, orderId)` PKs |
| Backfill | Same materializer upserts | Idempotent re-run |

---

## Empirical Verification

| Scenario | Action | Outcome |
|----------|--------|---------|
| Second full backfill | Re-ran `pnpm db:order-read:backfill` | 206 rows processed; **206 projection orders** (no duplication) |
| Post-re-run validate | `pnpm db:order-read:validate` | **PASS** — no mismatches |
| Consumer skip on replay | `OrderProjectionConsumerRegistry` checks `hasProcessed` | Unit tested |

---

## Relay / Consumer Replay Safety

- Multiple relay batches on same `eventId` → consumer idempotency store skips re-processing
- Multiple backfills → upsert overwrites same projection rows; counts unchanged
- `lastEventId` updated to latest processing id (UUID, 36 chars)

---

## Test Coverage

| Test file | Coverage |
|-----------|----------|
| `OrderProjectionConsumerRegistry.test.ts` | Skip when already processed |
| `OrderReadProjectionMaterializers.integration.test.ts` | Materializer idempotent sync |
| `readComposition.test.ts` | Delegate wiring |

Full Vitest suite: **193 files, 1140 tests PASS**

---

## Verdict

**Idempotency VERIFIED** for backfill re-runs and registry skip semantics.
