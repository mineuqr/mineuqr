# 03 — CANDIDATE MODELS

## MODEL A — Revive row + reuse old Charged Terms

**Meaning:** continuation of the prior paid commitment.

| Question | Answer |
|----------|--------|
| Continuation? | Only if the old snapshot is still the live contract. Cancel/expiry already terminated entitlement. |
| Old price still valid? | Not proven. Catalog may have changed. Cycle/plan may have changed. |
| After catalog change? | MRR would resume at the **old** amount. That is continuation, not a new sale. |
| After cycle/plan change? | Status-only revive ignores those fields; mixed update may insert a new snapshot (inconsistent). |
| Months/years later? | Still resumes stale terms. |
| MRR resume? | Yes, immediately if entitled and no concession. |
| Valid after cancel? | Commercially unproven. Cancel is an immediate commercial stop. |
| Valid after expiry? | Unproven. The snapshot covered a closed period. |

**Verdict: REJECTED.** The prior lifecycle audit already refused to accept silent reuse as a contract. I-REACT-02 forbids silent reuse unless continuation is explicitly proven. It is not proven.

## MODEL B — Revive row + new Charged Terms snapshot

**Meaning:** same account subscription identity; **new** paid commitment at then-current Live Plan offer.

| Question | Answer |
|----------|--------|
| Financially correct? | Yes. New commitment → current `currentPriceForPlan(planId, cycle)`. |
| Old snapshots? | Remain immutable. Not UPDATE/DELETE. |
| MRR? | Switches to the new current snapshot. |
| `effectiveFrom`? | Reactivation instant (`now`). |
| Price changed? | New snapshot uses new offer. History stays at old amount. |
| Plan/cycle changed? | Explicit inputs of the Reactivation command. Yearly = yearly offer. |
| Concession? | Cancelled concession is not restored. New free period is a separate grant, or a free-reactivate variant that writes a concession instead of a snapshot. |
| Atomic? | Same Classification A transaction as `applyAdminCommercialIdentityChange`. |

**Verdict: PREFERRED.**

## MODEL C — New subscription row

**Meaning:** old row is historical forever; create a new account subscription.

| Question | Answer |
|----------|--------|
| Identity | Breaks “one owner account subscription” (AUTHORITY-CLEANUP-1). |
| History | Snapshots/bindings/concessions stay on the **old** `subscriptionId`. |
| Entitlement | New row wins canonical pick if entitled. Dual-row GAP. |
| MRR | New snapshot on new id. Old snapshot on old id is not current if old row is not entitled. |
| Duplicate prevention | Create-after-cancel already allows this. |
| Old row active again? | Must never happen if C is chosen. Today it still can via update. |

**Verdict: REJECTED** as the Admin Reactivation contract. It already exists as an accidental path and is a dual-row GAP, not a designed model.

Create remains valid only when **no** account-level subscription row exists.
