# CHECK-SETTLEMENT-METHODS-1 — Migration Notes

## Schema

- Migration: `drizzle/0070_check_settlement_transactions.sql`
- Journal tag: `0070_check_settlement_transactions`
- Governance: `CANONICAL_MIGRATION_TAIL_TAG` / entry count bumped to **71**

## Apply

```bash
pnpm db:migrate
pnpm db:governance-check
```

## Runtime behavior after migrate

- New paid / complimentary settles write tender row(s).
- Existing paid Checks without rows remain valid for Revenue (Check.grandTotal).
- No data backfill required for certification.

## Rollback note

Dropping `check_settlement_transactions` is safe for Revenue KPIs (Check table unchanged). Do not drop without product approval if tender analytics already shipped.
