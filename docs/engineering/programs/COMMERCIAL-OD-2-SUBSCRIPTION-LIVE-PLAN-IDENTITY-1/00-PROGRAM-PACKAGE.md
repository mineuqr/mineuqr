# COMMERCIAL-OD-2-SUBSCRIPTION-LIVE-PLAN-IDENTITY-1

| Field | Value |
|-------|-------|
| **Type** | Subscription storage identity cutover |
| **Date** | 2026-08-15 |
| **Authority** | Architecture Authority / Technical Design Authority |
| **Depends on** | OD-1 APPROVED · OD-5 PASSED |
| **Status** | **PRODUCTION CERTIFIED — 0088 applied; app deploy / git not done** |
| **Production DML** | **NOT executed** |

## Target

```
BEFORE
user_subscriptions.planId
        ↓
integer legacy identity
        ↓
bridge
        ↓
Live Plan UUID

AFTER
user_subscriptions.planId
        ↓
commercial_plans.id UUID
        ↓
Canonical Plan Identity
```

Checkout / admin APIs may still accept integer handles (OD-3). Writers resolve integer → UUID via `resolveCanonicalLivePlanId` before persist.

## What this program did

- Schema: `user_subscriptions.planId` varchar(36)
- Migration `0088_user_subscriptions_live_plan_identity` (map via `commercial_plans.code`; populate → validate → destructive cutover)
- Safety correction: `0088-MIGRATION-SAFETY.md`, `PRE-DESTRUCTIVE-VALIDATION.md`, `MIGRATION-REPLACEMENT-DECISION.md`
- Journal terminus 0088 (89 entries)
- Writers persist UUID: trial, register, admin create/update, PayPal, Tap
- Readers accept UUID or leftover integer
- Identity / residual / governance guards updated

## What this program did not do

- Production APPLY of 0088
- OD-3 public/admin integer API removal
- OD-4 `LEGACY_PLAN_BRIDGE` retirement
- DROP `subscription_plans`
- Checkout Offer List Price / MRR / Charged Terms / Tax / FX / Payment / Refund / POS / Settlement rewrite
- ADR-034 / 035 / 036 file amendments

## STOP

Do not apply 0088 to production from this program. Do not start OD-3, OD-4, or SAFE DELETE.
