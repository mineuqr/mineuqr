# 06 — FUTURE PROGRAM RECOMMENDATIONS

These programs are **justified by evidence**. They are **not** authorized, started, or sequenced as a mandate. Architecture Authority decides.

## Recommended (evidence-backed)

### 1. OD-3 — Public / API UUID Cutover

**Why:** Integer `planId` is still the public and admin contract even though storage is UUID. Checkout, Pricing, Customer Success, `listPlans`, PayPal `custom_id`, Tap `metadata.plan_id`, and admin `z.number()` all enter through the leftover integer.

**In scope (when authorized):**

- Replace or dual-accept public/admin `planId` with Live Plan UUID (or `code` — AA choice)
- Client Pricing + Customer Success
- Webhook dual-read of integer then UUID
- `listPlans` DTO (`id` vs `catalogPlanId`)

**Out of scope:** leftover table drop; Charged Terms; MRR; tax; FX; POS.

**Does not by itself allow:** dropping `LEGACY_PLAN_BRIDGE` or `subscription_plans`.

### 2. OD-4 — Legacy Bridge Retirement

**Why:** After OD-3, `LEGACY_PLAN_BRIDGE` and `PLAN_ID_TO_CATALOG_PLAN` remain the only maps from 30001–30003. They are still required for bind-by-integer, unbound digit-string context, bootstrap alignment, and reverse display.

**Prerequisite:** OD-3 complete (no remaining integer ingress), plus proof that Production `bindings.legacyPlanId` is unused for resolution.

**In scope:** retire both maps; stop writing `legacyPlanId`; entitlement fallback by Live Plan UUID/`code` only.

**Out of scope:** DROP `subscription_plans` (separate).

### 3. SAFE DELETE `subscription_plans`

**Why:** Production runtime does not read or write the table. Three leftover catalog rows remain. No FK. Historical migrations must stay. Drop is a new gated migration.

**Prerequisites:**

- OD-3 + OD-4 complete (or AA explicitly accepts leftover table drop while integer APIs remain — **not recommended**; scripts/seeds still couple the integer catalog)
- ORM helpers + seeds + reset KEEP lists + stale S5 audit join retired
- AA deletion approval
- Backup + read-only preflight

**Must not:** invent a third catalog; move prices into a new leftover table; reconstruct Charged Terms from leftover prices.

## Optional / parallel (not identity cutovers)

### 4. Ops-script alignment (S5 audit join)

`scripts/data-integrity-audit-phase2-readonly.mjs` still joins `user_subscriptions.planId` to `subscription_plans.id`. After OD-2 this query is false-positive on all UUID rows. Repair is script-only. Can run anytime. Not a commercial authority change.

### 5. Dead-helper / dead-entitlement cleanup

`getSubscriptionPlans` / `getSubscriptionPlanById` / `createSubscriptionPlan` and `resolveTableOrderingEntitlement` / `BASIC_FREE_PLAN_ID` are unreachable at production runtime. Removing them without dropping the table is possible but couples tests. Prefer bundling with SAFE DELETE or a dedicated dead-code program after AA review.

## Explicitly not recommended as next automatic steps

- Editing 0088 or historical 0000–0006
- Dropping `legacyPlanId` in the same program as OD-3
- Changing Checkout price policy, MRR, Charged Terms, Tax, FX, Refund, POS
- Creating `subscription_plans_v2` or any third catalog
- Hardcoding Production UUIDs into application logic

## Suggested order if AA later authorizes a sequence

```
OD-3 Public/API UUID
    → OD-4 Bridge retirement
        → SAFE DELETE subscription_plans
```

Ops-script S5 repair may insert anywhere.

This forensics program **stops here**.
