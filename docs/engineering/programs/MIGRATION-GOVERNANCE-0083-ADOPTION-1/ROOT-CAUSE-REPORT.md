# MIGRATION-GOVERNANCE-0083-ADOPTION-1 — Root Cause Report

| Field | Value |
|-------|--------|
| **Program** | MIGRATION-GOVERNANCE-0083-ADOPTION-1 |
| **Date** | 2026-07-28 |

## Why governance stopped at 0082

1. **Production DB terminus** correctly sat at **`0082_refund_document_numbering`** (applied).
2. **Certified journal terminus** (`CANONICAL_MIGRATION_TAIL_TAG`) was also **0082**.
3. Program **REPORTING-SALES-CHANNEL-ANALYTICS-1** authored `drizzle/0083_order_ordering_channel.sql` + `schema.ts` columns **without**:
   - appending a journal entry in `drizzle/meta/_journal.json`
   - advancing governance constants
4. `migration-governance-guard` / `db:preflight` therefore classified **0083 as a non-legacy orphan** and blocked official migrate/deploy.

## Secondary defect (SQL)

0083 originally used `AFTER identity_scope` (snake_case). Production columns from **0066** are camelCase **`identityScope`** on both `orders` and `order_read_orders` (confirmed via information_schema probe).

That `AFTER` target would fail at apply time. Corrected under the mission rule *modify SQL only when corruption is proven*.

## Not a cause

- No fork of migration history
- No missing 0082 hash
- No need for 0084
- Snapshots beyond early lineage are not required for numbered SQL migrations in this repo’s practice (0082 likewise has no meta snapshot)
