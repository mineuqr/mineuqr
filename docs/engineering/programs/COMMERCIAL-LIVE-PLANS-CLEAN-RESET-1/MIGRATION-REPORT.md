# MIGRATION-REPORT.md

| Field | Value |
|-------|--------|
| File | `drizzle/0086_commercial_live_plans.sql` |
| Journal | idx 86, tag `0086_commercial_live_plans` |
| Action | **Replaced unapplied conversion SQL** (never hashed in production `__drizzle_migrations`) |
| Applied | **NO** |
| Governance terminus | `0086_commercial_live_plans` (87 journal entries) |

## Why replace rather than 0087

0086 was written by SIMPLIFICATION-1 and **never applied**. Production terminus is 0085. Governance allows replacing unapplied SQL; a second number would leave a dangerous conversion file in the journal.

## Difference vs old 0086

| Old (blocked) | New |
|---------------|-----|
| Copy published `001`/`002` composition onto plans | DELETE catalog aggregates |
| Fallback copy retired v1 onto Basic/Pro/Ent | Bootstrap three live plans in app |
| JSON charged-term backfill from snapshots | No snapshot read (0 rows; table dropped) |
| `DELETE` unmatched bindings | Bindings table kept; 0 rows; no DELETE of bindings |

## Apply gate (not executed)

`pnpm db:governance-check` — OK in this workspace.  
`pnpm db:migrate` — **do not run on production** until AA authorizes.
