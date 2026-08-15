# FINAL REPORT

**Program:** COMMERCIAL-ADMIN-SUBSCRIPTION-CHARGED-TERMS-INTEGRITY-1  
**Date:** 2026-08-15  
**Decision:** **B. ADMIN FLOW HAS A FINANCIAL INTEGRITY GAP**  
**Production:** read-only SELECT `2026-08-15T15:17:10.073Z`  
**Implementation:** none  
**780001:** unchanged, financially incomplete  

---

## 1. Why does 780001 have no Binding?

It was created on **2026-06-21** by `admin.createUserSubscriptionByAdmin` (audit 4950004). The binding table did not exist until **2026-07-29** (`0085`). Admin create did not call `ensureLivePlanBoundForSubscription` until **2026-08-15** (`fe209565`). No later Admin update re-bind ran on this id. Restaurant-delete audits with `targetId = 780001` are a restaurant-id collision, not this subscription.

## 2. Why does 780001 have no Charged Terms?

Charged Terms live only on a Binding. There is no Binding. `user_subscriptions` has no amount columns. The create audit stores plan `30003`, status, and dates — not amount, currency, or billing cycle.

## 3. Is the Admin Subscription flow financially complete?

**No.** Decision **B**. Post-cutover monthly Admin creates *can* write Charged Terms (810001, 840001). Pre-cutover Admin creates cannot have them. Bind is fail-soft. Yearly cycle is not passed into bind. UI amount is not persisted.

## 4. What exactly is the source of the $99/month shown in the Admin UI?

**Current Live Plan Offer List Price** (`commercial_prices` global monthly for the selected plan), formatted by `formatPlanPriceForCycle`. It is **display-only**. It is not an Admin input and is not written to the subscription or to Charged Terms by the mutate payload.

780001's persisted cycle is **yearly**. $99/month is the monthly catalog display, not a frozen commitment for that row. Today's yearly enterprise catalog price is 999.00 USD — equally unusable as historical Charged Terms.

## 5. Should Admin-created qualifying subscriptions contribute to MRR?

**Yes, if and only if** they are in the COMMERCIAL population, the canonical row is MRR-eligible (`countsInMrr` + entitlement), **and** valid Charged Terms exist. Then MRR is the Charged Terms monthly equivalent.

INTERNAL rows (780001) must not enter certified commercial MRR by classification, even if later bound.

## 6. Is Binding mandatory for them?

**For entitlement: no. For financial completeness / invoice / MRR: yes.** See I-ADMIN-CT-01. Runtime Admin create attempts bind and does not require it for HTTP success.

## 7. Is Charged Terms mandatory for them?

**For financial completeness and MRR: yes.** Missing Charged Terms → MRR 0, invoice PDF refused. Not required for product entitlement.

## 8. Can 780001 be safely remediated?

**No, not from recoverable original financial terms.** Plan, yearly cadence, and period are known. Amount and currency at commitment time are **not** proven. Do not write 99 or 999 onto a Binding. Leave 780001 unchanged.

## 9. Are the other Production subscriptions affected?

Yes, as a population:

- **750001**: same Admin-create gap (no CT).
- **600001, 690001**: unbound; origin of 600001 unproven; 690001 Admin-updated only.
- **810001, 840001**: Admin-created **after** bind-on-create; have Charged Terms (19.00 / 99.00 USD monthly).
- User **14760004** holds four account-level rows and one restaurant; canonical entitled row is **840001**.
- Certified commercial MRR from this set, fail-closed, is **99.00** from 840001 Charged Terms if that owner is in the COMMERCIAL KPI batch — not from catalog fallback.

## 10. What is the minimum next authorized program?

**`COMMERCIAL-ADMIN-CHARGED-TERMS-COMPLETION-1`** (proposed, **not started**).

Pass `billingCycleCode` from the subscription; fail closed on qualifying Admin create if Charged Terms are not persisted; stop silent catalog overwrite of historical terms; add the tests listed in the decision. **Do not** mutate 780001. **Do not** start OD-4, SAFE DELETE, or webhook retirement.

---

## Git (this program)

Do not commit. Do not push. Do not deploy.

| Item | Value |
|------|--------|
| HEAD | `ff7d2a62a06cd1d968895a4bbac5c384bddd7da1` (`docs(commercial): certify live plan comprehensive audit`) |
| Branch | `main` |
| Working tree before program | clean |
| Tests added | `server/commercial/__tests__/adminSubscriptionChargedTermsIntegrity.guards.test.ts` (5 passed) |

See the closing git report in the operator response for `git status` / `git diff --stat` at stop.
