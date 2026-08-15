# COMMERCIAL-OD-5-PRODUCTION-PLAN-IDENTITY-PROOF-1

| Field | Value |
|-------|-------|
| **Type** | Read-only production forensics |
| **Date** | 2026-08-15 |
| **Resolves** | OD-5 — Production Plan Identity Proof |
| **Status** | **OD-5 — PRODUCTION PLAN IDENTITY PROOF PASSED** |
| **Queried** | 2026-08-15T11:39:27.932Z |
| **Target** | TiDB Cloud production / `mineuqr` |
| **Mutation** | **NONE** |

## Decision

Every current production `user_subscriptions.planId` integer (30001, 30002, 30003) maps deterministically:

```
integer → LEGACY_PLAN_BRIDGE code → exactly one commercial_plans.id
```

Binding UUIDs agree. No unmapped or ambiguous values. Charged Terms do not need reconstruction.

**OD-2 MAY PROCEED TO ARCHITECTURE / IMPLEMENTATION DESIGN.**  
OD-2 is **not** executed or authorized by this program.

## What this program did

- SELECT + INFORMATION_SCHEMA only against current production
- Mapping proof + binding cross-check
- This documentation package

## What this program did not do

- No UPDATE / INSERT / DELETE / ALTER / DROP
- No OD-2 schema cutover
- No API, checkout, trial, webhook, MRR, or Charged Terms change
- No ADR amendment
- No commit / push / deploy
