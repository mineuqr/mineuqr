# SUBSCRIPTION-IDENTITY-MIGRATION

## Current

`user_subscriptions.planId` = **legacy integer only**.  
Canonical Live Plan UUID lives on `commercial_subscription_bindings.planId` when bound.

Unbound path: integer → `LEGACY_PLAN_BRIDGE` → catalog code → entitlements.

## Target if AA approves later

`user_subscriptions` references `commercial_plans.id` (or `code` if AA chooses B).

## Why not executed

- Column is `int NOT NULL`. In-place type change is a migration that can lose unmapped rows.
- Production mapping was **not** re-queried in this session (STOP: verify before production-affecting change).
- Historical forensics (2026-08-14): 5 rows, plans 30002/30003 only — would be deterministic **if** those Live Plans exist and AA chooses UUID-by-code lookup.
- Incomplete mapping (e.g. planId `1` / `102` in tests) must fail closed, not guess.

No Charged Terms rewrite. No new mapping table.
