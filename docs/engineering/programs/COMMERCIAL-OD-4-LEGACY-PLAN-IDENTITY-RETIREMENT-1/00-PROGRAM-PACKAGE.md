# 00 — PROGRAM PACKAGE

**Program:** COMMERCIAL-OD-4-LEGACY-PLAN-IDENTITY-RETIREMENT-1  
**Kind:** Architecture + implementation + Production retirement  
**Status:** **BLOCKED**  
**Baseline HEAD:** `17d990dd` — `docs(commercial): certify od3 uuid plan identity in production`

## Objective

Retire leftover Commercial Plan identity bridges after OD-3 Production certification.

## Non-goals (honored)

- No DROP of `subscription_plans`
- No Charged Terms / MRR / Checkout price / Tax / FX / Settlement / POS changes
- No automatic commit / push / deploy
- No Production DDL

## Why BLOCKED

1. Webhook leftover integer **read** cannot be proven empty (in-flight provider payloads).
2. Therefore `LEGACY_PLAN_BRIDGE` and `resolveCanonicalLivePlanId` integer branch **remain**.
3. `bindings.legacyPlanId` **column** was not dropped (no independently verified Production backup; no authorized migrate).
4. Production application was **not** redeployed with this program’s code.
5. Full leftover-identity search still has classified residual (tests, historical migrations, SAFE DELETE surface).

Partial runtime progress is recorded in later files. It is **not** a partial certification.
