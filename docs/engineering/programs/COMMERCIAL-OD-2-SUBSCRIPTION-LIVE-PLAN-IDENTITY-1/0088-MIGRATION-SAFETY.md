# 0088 MIGRATION SAFETY

Correction program: **COMMERCIAL-OD-2-0088-MIGRATION-SAFETY-FIX-1**

## Problem

The first 0088 dropped integer `user_subscriptions.planId` before an explicit conversion proof. A later `NOT NULL` on the swapped column is not a validation gate. TiDB DDL is not transactional; a late failure cannot restore the dropped integer column.

## Required sequence

```
Populate planIdUuid
        ↓
Validate conversion (fail closed)
        ↓
DROP integer planId
        ↓
Promote planIdUuid → planId NOT NULL
```

## Enforcement

1. **Read-only preflight** (`scripts/0088-live-plan-identity-preflight.mjs`) — required immediately before any future apply. Does not mutate.
2. **In-migration SQL gate** — `INSERT` into session temporary table `_0088_live_plan_identity_gate` duplicates PK `ok=1` when any fail-closed predicate is true. Drizzle-kit stops. `DROP COLUMN planId` is the next *destructive* statement and is not reached.

`NOT NULL` remains a final schema constraint. It is not the conversion proof.

## Mapping

```
30001 → basic → commercial_plans.id
30002 → professional → commercial_plans.id
30003 → enterprise → commercial_plans.id
```

UUIDs are not hardcoded. `LEGACY_PLAN_BRIDGE` remains the integer↔code compatibility map. No third mapping table.

## TiDB

- Statements are separated by `--> statement-breakpoint` (errno 8130).
- Local `TEMPORARY TABLE` is session-scoped (TiDB ≥ 5.3). Not a permanent catalog table.
- DDL is not rolled back. If the gate fires after `ADD`/`UPDATE`, integer `planId` is intact. Leftover `planIdUuid` is additive; drop it before retry.
