# PRODUCTION-MIGRATION-EXECUTION-0083 — Schema Validation Report

| Expectation | Pre | Post |
|-------------|-----|------|
| `orders.ordering_channel` | absent | **varchar(32) NULL** (ordinal 15) |
| `order_read_orders.ordering_channel` | absent | **varchar(32) NULL** (ordinal 7) |
| Immediately after `identityScope` | n/a | **Yes** (14→15 / 6→7) |
| Indexes in 0083 | none | n/a |
| Constraints in 0083 | none | n/a |
| `__drizzle_migrations` hash | missing | **once** (`5964102`, `created_at` 1784690000000) |

## Registration

| Field | Value |
|-------|--------|
| hash | `0f4df950d48b4b0116330a5be1243cead2c9dd42b1848982c4e77ec3ea04b657` |
| Duplicate hash rows | **0** |

`pnpm db:preflight` (post) → **All journal migration hashes recorded in DB**  
`pnpm db:verify-schema` → **OK**
