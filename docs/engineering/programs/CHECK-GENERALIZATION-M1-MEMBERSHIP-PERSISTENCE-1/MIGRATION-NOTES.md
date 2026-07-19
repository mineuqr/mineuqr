# CHECK-GENERALIZATION-M1 — Migration Notes

## Schema

- Migration: `drizzle/0071_check_order_membership.sql`
- Table: `check_order_membership`
- Unique: `(checkId, orderId)`
- Indexes: restaurant, check, order, `(restaurantId, orderId)`

## Deploy order

1. Run migration 0071.
2. Deploy application with dual-write (default ON).
3. Monitor ops event `check_membership_dual_write_failed`.
4. Do **not** execute fleet backfill in this program.

## Rollback

Set `CHECK_MEMBERSHIP_DUAL_WRITE=false`. Session discovery and Check money paths continue unchanged. Membership table may retain rows; they are inert for money/reads.

## Backfill (prepare only)

```bash
# Dry-run
npx tsx scripts/check-order-membership-backfill-execute.ts --scope tenant --restaurant-id <id> --dry-run

# Execute (ops window only)
CHECK_MEMBERSHIP_BACKFILL_CONFIRM=YES \
  npx tsx scripts/check-order-membership-backfill-execute.ts --scope tenant --restaurant-id <id>
```

Scopes: `tenant` | `full`. Skips voided Checks. Idempotent.
