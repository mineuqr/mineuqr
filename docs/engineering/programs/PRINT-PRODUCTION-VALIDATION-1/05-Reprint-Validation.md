# PRINT-PRODUCTION-VALIDATION-1 — Reprint Validation

## Checklist

| # | Criterion | Automated | Physical | Result |
|---|-----------|-----------|----------|--------|
| 1 | Reprint command works | `printWorkspace.commands.reprint` ✓ | **Pending** | — |
| 2 | New job created (not duplicate idempotency collision) | Time-based operator idempotency key ✓ | **Pending** | — |
| 3 | No duplicate failure on second reprint | Service idempotency per key ✓ | **Pending** | — |
| 4 | Job history preserved | `print_job_history` + attempts ✓ | **Pending** | — |

## Idempotency Behavior (Code)

| Source | Key pattern |
|--------|-------------|
| Order event | `order-event:{eventType}:{eventId}` |
| Operator print | `operator:print:{restaurantId}:{orderId}:{userId}:{timestamp}` |
| Reprint | `operator:reprint:{restaurantId}:{orderId}:{userId}:{timestamp}` |

Each reprint creates a **new** job with a unique idempotency key.

## Physical Procedure

1. Complete a successful print (§04).
2. Click **Reprint** on same order.
3. Verify second `print_jobs` row with `source = reprint`.
4. Verify both jobs appear in order detail `printJobs` list.
5. Confirm second physical ticket prints.
6. Query `print_job_history` for both jobs — `PrintRequested` … `PrintCompleted` trails.

## Automated Evidence

- `PrintingService.requestPrint` idempotency test PASS.
- `PrintWorkspaceCommandService.reprint` delegates to `source: "reprint"`.

## Defects Found

None filed (physical run not executed).

## Section Verdict

**NOT CERTIFIED** — physical reprint not validated.
