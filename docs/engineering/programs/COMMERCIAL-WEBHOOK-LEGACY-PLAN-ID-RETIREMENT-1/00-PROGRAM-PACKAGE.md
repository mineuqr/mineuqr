# 00 — PROGRAM PACKAGE

**Program:** COMMERCIAL-WEBHOOK-LEGACY-PLAN-ID-RETIREMENT-1  
**Role:** Architecture Authority / TDA  
**Date:** 2026-08-15  
**Status:** **BLOCKED — LEGACY WEBHOOK IDENTITY NOT PROVEN SAFE TO RETIRE**

## Objective

Establish, from evidence (not code inspection alone), whether PayPal/Tap webhook leftover integer `planId` READ can be closed. Implement UUID-only webhook reads **only if** Phase 4 = SAFE TO RETIRE.

## Decision (Phase 4)

**B. NOT PROVEN SAFE**

Legacy integer webhook traffic is **UNKNOWN**. Provider replay/retention is **UNKNOWN**. OD-3 UUID writers deployed the same calendar day. Integer payloads remain legitimately possible.

Phase 5–9 were **not executed**.

## Non-goals (honored)

- No change to `subscription_plans`, MRR, Charged Terms, Checkout pricing, Tax, FX, Settlement, Refund, POS, entitlements policy
- No change to `commercial_plans` identity, `user_subscriptions.planId` schema, `bindings.legacyPlanId`
- `LEGACY_PLAN_BRIDGE` and `PLAN_ID_TO_CATALOG_PLAN` **not** deleted
- OD-4 not restarted; SAFE DELETE not started
- PayPal/Tap provider APIs **not** called
- No commit / push / deploy

## Package

| File | Contents |
|------|----------|
| `_readonly-proof.mjs` | Production SELECT-only evidence script |
| `_QUERY-EVIDENCE.json` | Captured Production SELECT result |
| `01-WEBHOOK-FORENSICS.md` | Endpoint / parser / dependency matrix |
| `02-PRODUCTION-EVIDENCE.md` | Production SELECT findings |
| `03-DEPLOYMENT-TIMELINE.md` | Deploy timestamps and replay facts |
| `04-SAFETY-DECISION.md` | SAFE / NOT PROVEN SAFE / STILL REQUIRED |
| `FINAL-REPORT.md` | Authority report (17 sections) |
