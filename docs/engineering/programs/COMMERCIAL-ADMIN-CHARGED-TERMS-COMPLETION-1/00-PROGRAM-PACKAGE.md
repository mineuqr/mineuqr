# 00 — PROGRAM PACKAGE

**Program:** COMMERCIAL-ADMIN-CHARGED-TERMS-COMPLETION-1  
**Role:** Architecture Authority  
**Date:** 2026-08-15  
**HEAD at start:** `5b8a478b` (`docs(commercial): certify admin charged terms integrity gap`)  
**Branch:** `main`  
**Status:** **IMPLEMENTATION COMPLETE — FINAL AUDIT PASS WITH DOCUMENTATION CORRECTIONS — STOP before commit / push / deploy**  
**Commit:** not created (not authorized)

## Objective

Make **new** Admin-created subscriptions financially complete: Binding + Charged Terms with the Admin-selected `billingCycleCode`, fail closed if that cannot be done safely.

## I-ADMIN-CT-01 (enforced for new Admin creates)

Qualifying Admin-created commercial subscriptions must have valid financial completion through Binding + Charged Terms before they are considered financially complete / MRR-eligible.

Runtime: **all** Admin creates go through the same fail-closed financial writer. INTERNAL/TEST rows still stay outside certified commercial MRR via the existing COMMERCIAL population hub — no second eligibility system.

## Non-goals (honored)

No historical backfill. No 780001 recreate/bind/Charged Terms. No MRR rewrite. No OD-4 / SAFE DELETE. No Tax/FX. No `subscription_plans` drop. No webhook integer retirement. No schema migration.

## Package

| File | Contents |
|------|----------|
| `CURRENT-ADMIN-FLOW.md` | Pre-change create path |
| `TARGET-ADMIN-FLOW.md` | Implemented path |
| `ADMIN-CHARGED-TERMS-IMPLEMENTATION.md` | Code map |
| `BILLING-CYCLE-GOVERNANCE.md` | monthly / yearly, no silent remap |
| `PRICE-CURRENCY-SOURCE.md` | Live Plan offer + catalog currency |
| `BINDING-COMPLETION.md` | Insert-only, UUID planId |
| `CHARGED-TERMS-CREATION.md` | Snapshot facts |
| `TRANSACTION-ATOMICITY.md` | Classification B: compensation, not SQL atomicity |
| `FAIL-CLOSED-BEHAVIOR.md` | Error matrix |
| `IDEMPOTENCY.md` | Same-terms retry |
| `MRR-IMPACT.md` | Unchanged formula |
| `ENTITLEMENT-IMPACT.md` | Binding not required |
| `TEST-PLAN.md` | Matrix R |
| `PRODUCTION-VALIDATION.md` | Read-only SELECT; deploy not authorized |
| `OPEN-DECISIONS.md` | Update snapshot / historical rows |
| `FINAL-REPORT.md` | Fourteen answers |
