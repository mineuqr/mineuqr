# PRINTING-1 — Print Job Persistence

## Migration

`drizzle/0047_printing_service.sql` creates three tables (new schema; not legacy revival):

### `print_jobs`

Primary operational record: restaurant, order, status, source, idempotency key, trigger event metadata, canonical `payloadJson`, attempt count, timestamps.

Unique constraint: `(restaurantId, idempotencyKey)` for idempotent order-event handling.

### `print_job_attempts`

Per-attempt execution record with status, outcome (`in_progress` | `success` | `failure` | `cancelled`), and optional error metadata.

### `print_job_history`

Append-only operational audit trail keyed by operational event type (`PrintRequested`, `PrintDispatched`, etc.).

## Repository Boundaries

| Interface | Implementation |
|-----------|----------------|
| `PrintJobRepository` | `DrizzlePrintJobRepository` |
| `PrintJobAttemptRepository` | `DrizzlePrintJobAttemptRepository` |
| `PrintJobHistoryRepository` | `DrizzlePrintJobHistoryRepository` |

Application code depends on interfaces only; Drizzle is confined to `infrastructure/persistence/`.

## Deploy

```bash
npm run db:migrate
```
