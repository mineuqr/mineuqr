# PRINTING-1 — Test Summary

## Commands

```bash
npm run check          # PASS
npx vitest run server/printing   # 7 tests PASS
npm test               # full suite (1 prior failure fixed)
```

## New Tests

| File | Coverage |
|------|----------|
| `PrintingService.test.ts` | Lifecycle rules, create+dispatch, idempotency, markPrinted |
| `OrderPrintDispatchAdapter.test.ts` | Order event → printing service delegation |
| `architecture.guards.test.ts` | No connector/rendering; payload from order_read only |

## Existing Tests

- `OrderPrintingConsumer.test.ts` — still passes (port injection unchanged)
- `PrintWorkspaceReadService.test.ts` — passes (list/detail contracts stable)
- `DrizzlePrintWorkspaceReadStore.test.ts` — still queries only `order_read_*`

## Manual Verification

1. Run `npm run db:migrate` to apply `0047_printing_service.sql`
2. Trigger `OrderCreated` / `OrderReady` → verify `print_jobs` row + ops `print_requested`
3. Open Dashboard → Print tab → select order → Print / Preview / Cancel

## Migration Note

Migration was not applied automatically in CI agent session; operators must run `db:migrate` before production use of print persistence.
