# ADR — Commercial Plan Lifecycle (Proposed)

| Field | Value |
|-------|-------|
| **ADR ID** | ADR-COMMERCIAL-PLAN-LIFECYCLE *(proposed — not yet in constitutional ADR Registry)* |
| **Program** | COMMERCIAL-PLAN-LIFECYCLE-EXPERIENCE-1 |
| **Status** | **Proposed** · **Architecture Authority Amendment Revision 1** applied |
| **Date** | 2026-07-30 |
| **Amendment** | Revision 1 — Commercial Snapshot Invariant · **I-CPL-13** |
| **Supersedes** | None (refines Catalog LIFECYCLE + Subscription LIFECYCLE-MODEL) |
| **Related** | CC-01…CC-16 · SP lifecycle · Snapshot Runtime Authority · CAP-19/20/21 |

---

## Context

MineuQR has a Commercial Catalog Plan Version state machine (`draft|published|deprecated|retired`), an immutable Snapshot entitlement model, and a Subscription architecture lifecycle that includes Grace/Suspended — while runtime subscription statuses are a smaller set. Upgrade/downgrade/renewal/grandfathering behaviors are partially evented but not governed as one commercial plan experience. Ambiguity between Catalog states and Subscription states risks incorrect runtime coupling to mutable catalog data and blocks clean future Billing.

Architecture Authority Amendment Revision 1 strengthens Snapshot law: immutability begins at **bind**, plan changes require **new** Snapshot identity, and entitlements resolve **only** from the bound active Snapshot.

---

## Decision

1. **Dual-plane Commercial Plan Lifecycle** is mandatory:
   - **Catalog Offering plane:** Plan Identity + Plan Version states (Draft → … → Published → Deprecated → Retired → Archived), with optional governance states InternalReview, Approved, Scheduled before Published.
   - **Subscription Instance plane:** Draft → Trial → Active ⇄ Grace → Suspended → Expired → Cancelled → Archived.
   - **Snapshot artifact:** Created → Bound → Activated; **permanently immutable from bind**.

2. **Runtime entitlement** MUST resolve **exclusively** from the bound active Snapshot. Runtime MUST NEVER resolve entitlements directly from mutable Catalog data. (Unbound legacy bridge, if present, is a temporary documented exception — not a Catalog entitlement path for bound instances.)

3. **Grandfathered** is a Subscription **mode** when Snapshot references Deprecated/Retired Versions — not a Catalog Version state.

4. **Publish** remains fail-closed under **CC-16**; Published+ Versions remain immutable (**CC-02**).

5. **Upgrade / Downgrade / Migration / Admin Plan Replacement / Renewal requiring a new commercial definition** MUST bind a **newly created** Snapshot. The prior Snapshot remains historical, immutable, and must never be overwritten or repointed (**I-CPL-13**).

6. **Billing (future)** emits signals into Subscription transitions only; it does not own Catalog or Snapshot schema.

7. **AI** consumes entitlements only; **Reporting** consumes immutable Subscription/Snapshot facts.

8. Existing foundation enum remains the production minimum; governance pre-publish states and Archived are architecture-normative even if runtime collapses them until a foundation extension.

9. **Commercial Snapshot Invariant** (constitutional): once bound — never modify; never reuse after plan definition change; plan change → new Snapshot; entitlements from bound Snapshot only.

---

## Consequences

### Positive

- Deterministic transitions and clear ownership  
- Stable existing subscriptions under Catalog evolution  
- Billing can integrate via signals without redesign  
- Removes “Active Plan” language ambiguity  
- Snapshot identity lineage is auditable and non-destructive  

### Negative / costs

- Two state machines to teach and operate  
- Governance states may require future schema extension beyond current four Version states  
- Runtime Subscription status expansion needed eventually for Grace/Suspended (implementation OOS)  
- Plan-change paths must always allocate new Snapshot records (storage/history growth by design)  

### Neutral

- OPS event taxonomy gains additive names for review/schedule/grace/grandfather  

---

## Alternatives considered

| Alternative | Why rejected |
|-------------|--------------|
| **Single state machine** mixing Published and Active | Conflates offering and instance; breaks ownership |
| **Mutable Published Versions** | Violates CC-02; destroys Snapshot trust |
| **Grandfathered as Catalog state** | Incorrect plane; couples tenants to Catalog SM |
| **Entitlement reads live Catalog** | Violates Snapshot authority; unstable runtime |
| **Billing owns plan prices post-publish** | Creates second commercial SSOT |
| **Keep only four Version states forever without governance** | Insufficient for approval/schedule/archive experience demanded by program |
| **Mutate or repoint Snapshot in place on upgrade** | Violates Commercial Snapshot Invariant and **I-CPL-13** |
| **Reuse same Snapshot id after plan definition change** | Violates “never reuse after plan change” |

---

## Architecture rationale

Aligns Catalog SSOT (offerings), Subscription SSOT (instances/entitlements), and Snapshot immutability already certified for bound authority. Extends without rewriting Order, Restaurant, Check, or payment gateways. Matches PLATFORM-CAPABILITY-DISCOVERY CAP-19/20/21 boundaries. Amendment Revision 1 closes residual ambiguity about when immutability starts (bind) and how active vs historical Snapshot identity works.

---

## Invariants (adopted)

See **I-CPL-01…I-CPL-13** in [COMMERCIAL_PLAN_STATE_MACHINE.md](./COMMERCIAL_PLAN_STATE_MACHINE.md).

Normative summaries:

- Distinct Catalog vs Subscription SMs  
- Immutable Published+ Versions  
- Bound Snapshot permanently immutable  
- No entitlement from mutable Catalog  
- Stable holders under Deprecate/Retire  
- Billing signal-only  
- AI entitlement-only  
- Reporting immutable facts only  
- **I-CPL-13 Snapshot Identity** — exactly one active Snapshot; new Snapshot on plan change; historical preserved; never overwrite/repoint  

### I-CPL-13 — Snapshot Identity (Amendment Rev 1)

**Definition:** A Subscription SHALL reference exactly one **active** Commercial Snapshot at any point in time.

Whenever a Subscription changes Commercial Plans (Upgrade, Downgrade, Migration, Renewal requiring a new commercial definition, or Administrative Plan Replacement), the runtime SHALL bind the Subscription to a **newly created** Snapshot.

Historical Snapshots SHALL remain immutable and permanently preserved. Historical Subscriptions SHALL continue referencing their historical Snapshot. No historical Snapshot may ever be overwritten or repointed.

---

## Ratification note

This file is a **proposed ADR** inside the engineering program package, amended under Architecture Authority Amendment Revision 1. Constitutional registration into `docs/architecture/constitution/ADR-Registry.md` requires Architecture Authority acceptance under ADR Lifecycle — **out of scope** for this documentation-only program.
