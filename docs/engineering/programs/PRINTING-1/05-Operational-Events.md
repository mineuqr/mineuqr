# PRINTING-1 — Operational Events

Operational print events belong to the **Printing Service**, not the Order domain.

## Event Types

| Event | When emitted |
|-------|----------------|
| `PrintRequested` | Job created (`pending`) |
| `PrintDispatched` | Handed to connector port |
| `PrintStarted` | Execution acknowledged (`printing`) |
| `PrintCompleted` | Success (`printed`) |
| `PrintFailed` | Failure (`failed`) |
| `PrintCancelled` | Cancellation (`cancelled`) |

## Persistence

Each transition appends to `print_job_history` and may create a `print_job_attempts` row.

## Publication

`PrintStatusPublisher` → `OpsPrintStatusPublisher` maps to ops taxonomy:

- `print_requested`, `print_dispatched`, `print_started`, `print_completed`, `print_failed`, `print_cancelled`

These are **not** written to `order_domain_outbox` and do not affect Order projections.

## Domain Types

`server/printing/domain/PrintOperationalEvent.ts`
