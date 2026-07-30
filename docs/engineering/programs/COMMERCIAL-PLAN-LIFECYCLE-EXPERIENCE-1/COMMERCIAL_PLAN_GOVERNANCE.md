# COMMERCIAL PLAN GOVERNANCE

| Field | Value |
|-------|-------|
| **Program** | COMMERCIAL-PLAN-LIFECYCLE-EXPERIENCE-1 |
| **Date** | 2026-07-30 |
| **Amendment** | Revision 1 — Commercial Snapshot Invariant · **I-CPL-13** |

---

## 1. Ownership

| Concern | Owner |
|---------|-------|
| Plan Identity, Plan Version states, prices, policies, CC-14/15/16 | **Commercial Catalog** |
| Subscription instance states, entitlement evaluation, Snapshot persistence/bind | **Subscription Platform** |
| Snapshot schema / required fields | **Catalog** (contract) |
| Approval of commercial publish | **Commercial Publishing Authority** (role; platform admin policy) |
| Architecture invariants | **Architecture Authority** |
| Billing signals (future) | **Billing** (signal producer only) |
| Feature runtime behavior | **Business domains** (Order, Restaurant, …) after entitlement allow |

---

## 2. Authority

| Authority | May |
|-----------|-----|
| Catalog Admin | Create/edit Draft; submit review; deprecate/retire/archive per policy |
| Commercial Approver | Approve / reject InternalReview; waive to Approved |
| Publishing Authority | Execute Publish / SchedulePublish (CC-16 enforced) |
| Subscription Admin | Suspend/resume/cancel instances; bind **new** snapshots on plan change; cannot edit Catalog Versions; cannot mutate bound Snapshots |
| Architecture Authority | Change lifecycle laws via ADR/constitution programs; owns Commercial Snapshot Invariant / **I-CPL-13** |
| Billing (future) | Emit payment/renewal failure/success — cannot publish Catalog; cannot rewrite Snapshots |

**Separation:** The actor who edits Draft **SHOULD NOT** be the sole Publishing Authority in production governance (four-eyes preferred). Architecture allows single-admin ops environments with audited waive.

### 2.1 Constitutional Snapshot rules (Authority Amendment Rev 1)

Architecture Authority mandates:

1. Bound Snapshot → permanently immutable  
2. Never modify or reuse a Snapshot after Commercial Plan definition change  
3. Plan change → new Snapshot only  
4. Entitlements exclusively from bound active Snapshot  
5. Never resolve entitlements from mutable Catalog data  
6. **I-CPL-13** — exactly one active Snapshot; historical Snapshots preserved; no overwrite/repoint  

Violation of these rules is a **constitutional commercial platform defect**, not an operational preference.

---

## 3. Approval workflow

```
Draft
  → (optional) InternalReview
       → Approved
            → Scheduled? → Published
            → Published
```

| Gate | Required |
|------|----------|
| Composition complete | Before Approved/Publish |
| **CC-16** | Before Published (mandatory, fail closed) |
| Compatibility (CC-14) declared | Before Published |
| Regional readiness (CC-15) | When regional sale flagged |
| Dual control | Org policy for production |

Reject returns to **Draft**. Withdrawal from Approved → Draft is audited.

---

## 4. Publishing authority

| Rule | Detail |
|------|--------|
| Only Publishing Authority (or scheduled job under that authority) may move to **Published** | |
| Publish freezes commercial payload | **CC-02** |
| Storefront visibility | Published only (default) |
| OPS/Audit | Must emit Published event + actor |

Scheduled publish is still a Publish under authority delegated to scheduler with pre-approved payload.

---

## 5. Deprecation policy

| Topic | Policy |
|-------|--------|
| When | Successor Version Published *or* commercial withdrawal decision |
| Effect | Version → Deprecated; hide from new selection by default |
| Renewals | Allowed unless Migration Policy says otherwise |
| Communication | Migration requirements / breaking changes already on Version |
| Duration | Until Retire |

Deprecation **MUST NOT** rewrite Snapshots, repoint historical Snapshot identities, or Suspend subscriptions automatically.

---

## 6. Breaking-change policy

| Class | Examples | Required |
|-------|----------|----------|
| **Non-breaking** | Additive features, higher limits, cosmetic copy | New Version optional; preferred |
| **Breaking** | Removed features, lower limits, price semantics change, cycle removal | **New Version** + `breakingCommercialChanges` + CC-14 targets |
| **Catastrophic reopen** | Edit Published in place | **Forbidden** |

Breaking changes on live holders:

1. Publish successor Version  
2. Declare upgrade/downgrade/migration  
3. Existing holders remain Grandfathered on Snapshot until migrate/cancel/expire  

---

## 7. Retirement & archive governance

| Action | Authority | Constraint |
|--------|-----------|------------|
| Retire | Publishing / Catalog Admin per policy | Retirement Policy present |
| Archive | Catalog Admin + retention policy | Prefer no renewal-eligible holders; force-archive leaves Grandfathered until instance end |

---

## 8. Audit & observability

Every lifecycle command that changes Catalog Version state or Subscription commercial state **MUST** be auditable (actor, from, to, reason, correlation id). Snapshot bind/activate likewise.

Align event names with [COMMERCIAL_PLAN_STATE_MACHINE.md](./COMMERCIAL_PLAN_STATE_MACHINE.md).
