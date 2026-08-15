# COMMERCIAL-ADMIN-REACTIVATION-CONTRACT-1 — FINAL REPORT

**Program:** ARCHITECTURE CONTRACT + FORENSICS ONLY  
**Completed:** 2026-08-16  
**HEAD:** `625280ff`  
**Production mutation:** NONE  
**Implementation:** NONE  
**Commit / push / deploy:** NONE  

---

## 1. What Reactivation means

**A new commercial commitment** that returns the **existing** account-level subscription row to entitled `active`.

It is **not** continuation of a cancelled or expired commitment.  
It is **not** the current implicit `status=active` update.  
It is **not** create-a-second-row.

## 2. Continuation or new commitment?

**New commercial commitment.**

Cancel turns entitlement off immediately. Expiry ends the paid period. The last Charged Terms snapshot remains a **historical fact**, not a standing price lock.

## 3. May an old snapshot ever be reused?

**No** as live authority after termination.

Idempotent reuse is allowed only when the row is **already entitled** and the current snapshot already matches the resolved offer (duplicate click). That is not Reactivation of a closed commitment.

## 4. Is a new snapshot required?

**Yes** for paid Reactivation. Insert Snapshot N+1 from the then-current Live Plan offer.  
**No** for free Reactivation (concession only; never a $0 snapshot).

## 5. May the existing subscription row be reused?

**Yes.** That is the account commercial identity (`user_subscriptions.planId` = entitlement).

## 6. Is a new subscription row required?

**No.** Model C is rejected. Create is allowed only when **no** account-level row exists.

## 7. Entitlement

Turns on only after persist succeeds: `status=active` + future `currentPeriodEnd` + (paid snapshot **or** current concession). Selected Live Plan UUID controls capabilities.

## 8. MRR

Before: 0 (not entitled).  
Paid after: monthly-equivalent of the **new** snapshot.  
Free after: 0.  
Active concession: 0 (suppressed).

## 9. ARR

`MRR × 12`.

## 10. Concessions

Cancelled concessions are not restored. Free Reactivation writes a **new** concession from `now`. Paid Reactivation does not grant a concession.

## 11. After a catalog price change

Example: committed $29, catalog now $39, then cancel, then Admin Reactivate.

**Live commitment = $39** (Snapshot N+1). Snapshot #1 stays $29 forever. Later catalog $49 does not reprice N+1.

## 12. Plan / cycle change

Explicit inputs of the Reactivation command. Yearly = yearly Live Plan offer. Not a silent extra mutation.

## 13. Duplicate Reactivation

Already entitled + matching current snapshot → **IDEMPOTENT** (no N+2).  
Still terminated → one new snapshot + activate.

## 14. Partial failure

Paid: Classification **A** transaction. No entitled paid success without snapshot.  
Free: no entitled free success without concession.

Today’s implicit path **fails** this rule. Documented, not repaired.

## 15. Admin authorization

Dedicated procedure + `assertAdminAccess`. Close `updateUserSubscriptionByAdmin` as a smuggle path (`canceled|expired → active` rejected).

## 16. Audit

Required: `commercial_subscription_reactivated` with actor, subscriptionId, old/new status, plan UUID, cycle, old/new snapshot ids, `effectiveFrom`, reason, mode `paid|free`.

## 17. Next implementation program

**COMMERCIAL-ADMIN-REACTIVATION-IMPLEMENTATION-1**

Only after Architecture Authority accepts this contract.

Must include: dedicated procedure, Model B persist, free variant, close implicit update, CONFLICT create-if-row-exists, audit event, negative tests.

Must **not** start: OD-4, SAFE DELETE, webhook integer retirement, Production backfill, this contract’s implementation before acceptance.

---

## Current vs contract

| Item | Current | Contract |
|------|---------|----------|
| Dedicated Reactivate | **NOT IMPLEMENTED** | Required |
| Status-only `→ active` | **UNSAFE** implicit Model A | Forbidden |
| Create after cancel | Accidental Model C | Forbidden if row exists |
| Preferred model | None | **B** |

## Invariants

| ID | Result vs **current** code | Result vs **contract** |
|----|----------------------------|------------------------|
| I-REACT-01 | **FAIL** (no explicit semantics) | HOLD |
| I-REACT-02 | **FAIL** (silent reuse) | HOLD |
| I-REACT-03 | HOLD (no snapshot overwrite) | HOLD |
| I-REACT-04 | FAIL on status-only; HOLD if plan/cycle also changes | HOLD |
| I-REACT-05 | HOLD | HOLD |
| I-REACT-06 | HOLD (no $0 snapshot writer) | HOLD |
| I-REACT-07 | **FAIL** possible (entitle with no concession/snapshot) | HOLD |
| I-REACT-08 | **FAIL** | HOLD |
| I-REACT-09 | HOLD once entitled (current snapshot) — wrong snapshot if A | HOLD |
| I-REACT-10 | HOLD | HOLD |
| I-REACT-11 | AMBIGUOUS (mixed into generic update) | HOLD |
| I-REACT-12 | PARTIALLY SAFE / UNSAFE | IDEMPOTENT |
| I-REACT-13 | HOLD on Admin update/create | HOLD |
| I-REACT-14 | HOLD | HOLD |

These current FAILs are **documented defects of the implicit path**. They are not repaired in this program. They are not STOP conditions that invent a different model; they are why Model A is rejected.

## Production

SELECT `2026-08-15T19:05:59Z`. Journal 0090. Concessions 0.

One paid Admin create now exists: `900001` Snapshot #1 `admin_create` $29 monthly. That preserves paid create; it is **not** a Reactivation.

Canceled `840001` / `870001` and expired `810001` have **no** snapshots. Binding leftovers $19/$19/$29 are not financial authority. Status-only revive of those rows would entitle without a commitment — the defect this contract closes.

Do not mutate 780001 or any business row.

## Authorities preserved

Live Plan = current price.  
Charged Terms = historical paid commitment.  
Concession = temporary suppression.  
`planId` = entitlement.  
MRR = current snapshot, concession-suppressed.  
ARR = MRR × 12.  
Paid Admin create remains supported.
