# 00 — PROGRAM PACKAGE

**Program:** COMMERCIAL-OD-3-PUBLIC-API-UUID-CUTOVER-1  
**Status:** IMPLEMENTATION COMPLETE — not committed, not pushed, not deployed  
**Baseline HEAD at start:** `a126a37e` (forensics docs; program brief cited `9f825ce1`)

## Objective

Move public/admin/application-facing Commercial Plan identity from leftover integer handles to canonical Live Plan UUID (`commercial_plans.id`).

## Non-goals (honored)

- No DROP/ALTER of `subscription_plans`
- No retirement of `LEGACY_PLAN_BRIDGE` or `PLAN_ID_TO_CATALOG_PLAN`
- No drop of `bindings.legacyPlanId`
- No Charged Terms / MRR / Checkout price / Tax / FX / Settlement / POS changes
- No OD-4, no SAFE DELETE, no automatic deploy

## Package

| File | Contents |
|------|----------|
| `01-PUBLIC-API-FORENSICS.md` | Integer contract search |
| `02-API-CONSUMER-MATRIX.md` | Consumer current → target |
| `03-UUID-CUTOVER-DESIGN.md` | Validation and fail-closed rules |
| `04-COMPATIBILITY-STRATEGY.md` | Dual-read / write-cutover |
| `05-CHECKOUT-CUTOVER.md` | Checkout + Pricing |
| `06-WEBHOOK-CUTOVER.md` | PayPal / Tap |
| `07-TRIAL-CUTOVER.md` | Trial UUID ingress |
| `08-ADMIN-PUBLIC-CUTOVER.md` | Admin, listPlans, CS |
| `09-TEST-PLAN.md` | Tests run |
| `10-PRODUCTION-CUTOVER-PLAN.md` | Deploy is AA-owned |
| `11-OD4-DEPENDENCY-REPORT.md` | Remaining bridge callers |
| `12-SAFE-DELETE-IMPACT.md` | Still blocked |
| `FINAL-REPORT.md` | A–S |
