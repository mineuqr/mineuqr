# FINAL REPORT

**Program:** COMMERCIAL-CHARGED-TERMS-LIVE-PLAN-SOURCE-OF-TRUTH-1  
**Date:** 2026-08-15  
**HEAD:** `e936e654`  
**STATUS:** IMPLEMENTATION COMPLETE — not committed, not pushed, not deployed, 0089 not applied

## 1. Architecture decision

LIVE PLAN (`commercial_prices` / `currentPriceForPlan`) is the sole **current** price authority.  
Charged Terms snapshots are immutable **commitment facts**. Catalog edits do not reprice A or B. Binding leftover charged fields and `subscription_plans` are not price authority.

## 2. Implementation result

- Admin create/update still resolve offer from Live Plan; fail closed if missing.
- Plan/cycle change: SQL transaction inserts Snapshot #N+1 then updates identity.
- Webhook: first bind may snapshot Live Plan current offer; existing snapshot is never versioned by bind retry.
- MRR reads **current snapshot only** (Binding leftover fallback removed).
- Complimentary / trial / OD-4 / Production DML: not started.

## 3. Migration replacement

`0089` is now CREATE TABLE + index only. Binding INSERT…SELECT **removed**. No 780001. No unrelated tables. **Do not apply here.**

## 4. Tests

Targeted suite **92 passed** (Live Plan authority, snapshots, Admin completion, MRR/ARR, governance, identity, trial/PayPal).

## 5. Build

`pnpm build` **passed** (exit 0). Existing Vite chunk-size / `__vite-browser-external` warnings are repository debt, not caused by this program.

## 6. MRR / ARR

MRR = sum of current snapshot monthly equivalents ($10 + $9 = $19; yearly $120 → $10).  
ARR = existing `MRR × 12` (`arrMethod: "MRR_X12"`). $19 → $228. Not catalog.

## 7. Legacy authority

Guards: no `subscription_plans` / `legacyPlanId` / Binding leftover as new-snapshot or MRR price. Provider IDs unused as snapshot ids.

## 8. Git

Dirty working tree on `main` @ `e936e654`. Not staged/committed/pushed.

## 9. Production readiness

Schema/runtime ready **locally**. Production lacks 0089. Do not deploy runtime first. Previous APPLY-1 targeted rejected Binding-copy SQL and was BLOCKED (backup + 840001 amount). Do not run that apply.

## 10. Next authorized program

**COMMERCIAL-CHARGED-TERMS-SNAPSHOT-PRODUCTION-APPLY-1** (or a renamed apply of **this empty 0089**), after:

1. Post-0088 recoverable backup evidence  
2. Confirmation that 0089 DML is empty (no Binding copy)  
3. Then separately authorized **deploy** of snapshot-aware runtime
