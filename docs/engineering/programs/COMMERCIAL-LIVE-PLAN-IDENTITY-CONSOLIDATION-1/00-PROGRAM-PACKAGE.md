# COMMERCIAL-LIVE-PLAN-IDENTITY-CONSOLIDATION-1

| Field | Value |
|-------|-------|
| **Type** | Identity forensics + authority guards (no schema/API cutover) |
| **Date** | 2026-08-15 |
| **Authority** | Architecture Authority / Technical Design Authority |
| **Baseline** | Residual cleanup uncommitted on `4fdfd8f6` |
| **Primary status** | **IDENTITY CONSOLIDATION — BLOCKED** |

## Verdict

`LEGACY_PLAN_BRIDGE` / integer `planId` / `legacyPlanId` are **still required** by public APIs and `user_subscriptions.planId` (int).

Removing them requires:

1. AA choice: subscription FK = `commercial_plans.id` (UUID) vs `code`
2. Production mapping proof
3. `ALTER` of `user_subscriptions.planId`
4. Public `planId: number` → canonical id cutover

This program does **not** execute that migration.

## What shipped

- Forensic package (this directory)
- Authority guards GUARD-IDENTITY-01…07
- No Checkout / MRR / Charged Terms / provider change
- No DROP TABLE
- No new mapping table

## Validation

- Tests: **20 files / 165 passed** (identity, residual, catalog, checkout, MRR, trial, webhook, subscription, entitlements, admin invoice, notifications, reporting)
- Build: **`pnpm build` exit 0**

## STOP

Do not start SAFE DELETE or the schema/API identity cutover without AA direction.
