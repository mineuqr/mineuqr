# MIGRATION-GOVERNANCE-0083-ADOPTION-1 — Migration Governance Report

| Field | Value |
|-------|--------|
| **Program** | MIGRATION-GOVERNANCE-0083-ADOPTION-1 |
| **Date** | 2026-07-28 |
| **Prior terminus** | `0082_refund_document_numbering` (83 entries) |
| **New terminus** | `0083_order_ordering_channel` (84 entries) |

## Adoption procedure (executed)

| Step | Action | Result |
|------|--------|--------|
| 1 | Reuse existing SQL file (no 0084, no rename) | Pass |
| 2 | Append journal entry idx **83**, tag `0083_order_ordering_channel`, `when` `1784690000000` | Pass |
| 3 | Advance `CANONICAL_MIGRATION_TAIL_TAG` / count → **0083** / **84** | Pass |
| 4 | Align guard messages + governance unit tests | Pass |
| 5 | Update `docs/DB_MIGRATION_GOVERNANCE.md` lineage | Pass |
| 6 | Correct proven `AFTER` column name → `identityScope` | Pass (hash updated) |
| 7 | Production `drizzle-kit migrate` | **Not run** (out of scope) |

## Files touched

| Path | Change |
|------|--------|
| `drizzle/meta/_journal.json` | Added 0083 entry |
| `drizzle/0083_order_ordering_channel.sql` | Corruption fix: `AFTER identityScope` |
| `scripts/lib/migration-governance-lib.cjs` | Terminus constants |
| `scripts/migration-governance-guard.cjs` | Messages 0000–0083 |
| `scripts/__tests__/migrationGovernance.test.ts` | Expect 0083 / 84 |
| `docs/DB_MIGRATION_GOVERNANCE.md` | Lineage text |

## Application code

**Not modified** (`schema.ts`, routers, reporting services untouched in this program).
