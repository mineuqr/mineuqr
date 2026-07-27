# ORDERING-CHANNEL-HISTORICAL-BACKFILL-1 — Migration Plan (dormant)

Phase 2 is **not authorized**. Plan retained if Architecture Authority later supplies CERTAIN evidence (e.g. recovered channel metadata).

## Requirements (if approved)

1. **Dry-run mode** — classify + report proposed UPDATEs; zero writes
2. **Idempotent** — `WHERE ordering_channel IS NULL AND <certain predicate>`
3. **Resumable** — batch by `id` ranges; audit log per batch
4. **Dual-write** — update `orders` then project/rebuild `order_read_orders.ordering_channel` for touched ids only
5. **Before/after stats** — missing counts, confidence histogram, reporting DTO totals (Order Sales by channel vs Check Revenue unchanged)
6. **Rollback** — store prior `(orderId, ordering_channel)` pairs (all NULL today) for reversible UPDATE

## Forbidden in any future execution

- Mapping identityScope → OrderingChannelId as CERTAIN
- Payment / revenue / tax / amount inference
- Updating LIKELY or UNKNOWN rows
