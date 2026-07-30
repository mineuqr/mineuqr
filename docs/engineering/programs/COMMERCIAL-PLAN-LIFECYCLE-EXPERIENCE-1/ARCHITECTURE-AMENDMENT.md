# ARCHITECTURE AMENDMENT — Revision 1

| Field | Value |
|-------|-------|
| **Program** | COMMERCIAL-PLAN-LIFECYCLE-EXPERIENCE-1 |
| **Mode** | Architecture Authority Amendment · Documentation Only |
| **Revision** | 1 |
| **Date** | 2026-07-30 |
| **Constraints** | No implementation · No runtime/DB/API · No commit · No push · No deploy |

---

## Authority additions

Architecture Authority incorporates the following as a **constitutional rule** of the Commercial Platform:

### Commercial Snapshot Invariant

Once a Snapshot becomes bound to any Subscription:

1. The Snapshot MUST become permanently immutable.  
2. A Snapshot MUST NEVER be modified.  
3. A Snapshot MUST NEVER be reused after the Commercial Plan definition changes.  
4. Any Commercial Plan change MUST produce a new Snapshot.  
5. Runtime Entitlements MUST always be resolved exclusively from the bound Snapshot.  
6. Runtime MUST NEVER resolve entitlements directly from mutable Catalog data.  

### New invariant

**I-CPL-13 — Snapshot Identity**

A Subscription SHALL reference exactly one **active** Commercial Snapshot at any point in time. Plan changes (Upgrade, Downgrade, Migration, Renewal requiring a new commercial definition, Administrative Plan Replacement) SHALL bind a **newly created** Snapshot. Historical Snapshots remain immutable and permanently preserved; historical Subscriptions keep their historical Snapshot reference; no historical Snapshot may be overwritten or repointed.

---

## Affected documents

| Document | Change |
|----------|--------|
| [COMMERCIAL_PLAN_LIFECYCLE.md](./COMMERCIAL_PLAN_LIFECYCLE.md) | Snapshot §4 rewritten: invariant at bind; I-CPL-13; renew/migrate/admin rows |
| [COMMERCIAL_PLAN_STATE_MACHINE.md](./COMMERCIAL_PLAN_STATE_MACHINE.md) | Commands/guards/illegal list; **I-CPL-03/04** tightened; **I-CPL-13** added |
| [PLAN_VERSIONING_STRATEGY.md](./PLAN_VERSIONING_STRATEGY.md) | Snapshot Version §2: constitutional invariant + active/historical identity |
| [COMMERCIAL_PLAN_GOVERNANCE.md](./COMMERCIAL_PLAN_GOVERNANCE.md) | Authority §2.1 constitutional Snapshot rules; deprecation non-repoint |
| [ADR-COMMERCIAL-PLAN-LIFECYCLE.md](./ADR-COMMERCIAL-PLAN-LIFECYCLE.md) | Decision items 2/5/9; alternatives; **I-CPL-13** appended |

**Not modified (per amendment scope):** `PLAN_TRANSITION_MATRIX.md`, `COMMERCIAL_PLAN_BOUNDARIES.md`, `FINAL-REPORT.md`, `00-PROGRAM-PACKAGE.md` (still consistent; boundaries already exclusive-Snapshot).

---

## New invariant (canonical text)

**I-CPL-13 — Snapshot Identity**

A Subscription SHALL reference exactly one active Commercial Snapshot at any point in time.

Whenever a Subscription changes Commercial Plans (Upgrade, Downgrade, Migration, Renewal requiring a new commercial definition, or Administrative Plan Replacement), the runtime SHALL bind the Subscription to a newly created Snapshot.

Historical Snapshots SHALL remain immutable and permanently preserved.

Historical Subscriptions SHALL continue referencing their historical Snapshot.

No historical Snapshot may ever be overwritten or repointed.

---

## Architecture impact

| Area | Impact |
|------|--------|
| Entitlement resolution | Exclusive bound active Snapshot; Catalog path forbidden for bound instances |
| Immutability start | Clarified at **bind** (stronger than activate-only wording) |
| Plan-change paths | Must allocate new Snapshot identity; prior becomes historical |
| Same-definition renewal | May retain active Snapshot (definition unchanged ≠ plan change) |
| Catalog Deprecate/Retire | Still must not rewrite Snapshots |
| Dual-plane model | Unchanged |
| Billing / AI / Reporting | Unchanged consumption laws; reinforced by invariant |

---

## Backward compatibility

| Concern | Assessment |
|---------|------------|
| Existing Catalog Version SM (`draft\|published\|deprecated\|retired`) | Unchanged |
| Published Version immutability (CC-02) | Unchanged |
| Snapshot Runtime Authority (bound exclusive) | Strengthened, not contradicted |
| Grandfathered mode | Unchanged (still Snapshot-stable under Catalog retire) |
| Same-definition renew retain Snapshot | Compatible with I-CPL-13 |
| Historical Snapshot preservation | Explicitly required (additive strictness) |
| Unbound legacy bridge | Remains temporary exception language in ADR; bound instances follow invariant |

No schema, API, or runtime change in this amendment.

---

## Validation — non-violation check

| Constraint | Result |
|------------|--------|
| **Order Constitutional Core** | ✓ — Order remains core aggregate; does not own Snapshots or plan states |
| **Check Monetary Ownership** | ✓ — Check remains sole monetary AR; commercial Snapshot is SaaS entitlement, not Check money |
| **Capability Catalog Governance** | ✓ — Aligns CAP-19 Catalog / CAP-20 Snapshot / CAP-21 Subscription |
| **Aggregate Boundaries** | ✓ — Catalog offerings vs Subscription instances vs Snapshot artifacts remain distinct |
| **SSOT** | ✓ — Offerings = Catalog; entitlement facts = bound Snapshot; instances = Subscription |
| **Subscription Runtime Ownership** | ✓ — Subscription owns persist/bind/active Snapshot reference and entitlement evaluation |

---

## Output status

Amendment Revision 1 documentation complete.

**STOP.**
