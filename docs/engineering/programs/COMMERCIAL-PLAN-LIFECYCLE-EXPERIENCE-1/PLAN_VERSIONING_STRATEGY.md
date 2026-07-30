# PLAN VERSIONING STRATEGY

| Field | Value |
|-------|-------|
| **Program** | COMMERCIAL-PLAN-LIFECYCLE-EXPERIENCE-1 |
| **Date** | 2026-07-30 |
| **Amendment** | Revision 1 — Commercial Snapshot Invariant · **I-CPL-13** |

---

## 1. Plan Version

| Concept | Definition |
|---------|------------|
| **Plan Identity** | Stable commercial product (`code`/`id`); survives version churn (**CC-01**) |
| **Plan Version** | Immutable commercial contract once Published: prices, cycles, feature bundle, limit profile, trial/migration/retirement policies, CC-14 matrix, regional readiness |
| **Version code** | Human/commercial label (e.g. `v2026.07`); unique per Plan |
| **Composition** | Only mutable in Draft (and unlock on reject-to-Draft) |

**Rule:** Commercial corrections after publish = **new Plan Version**, never edit-in-place.

---

## 2. Snapshot Version

| Concept | Definition |
|---------|------------|
| **Commercial Snapshot** | Frozen projection of a Plan Version (+ bind metadata) for a Subscription instance |
| **Snapshot identity** | New id per capture; prior snapshots retained forever (**I-CPL-13**) |
| **Snapshot “version”** | Not a Catalog Version state — an immutable artifact generation |
| **Authority** | Bound active Snapshot → exclusive entitlement SSOT |
| **Immutability start** | At **bind** (not merely at activate) — Commercial Snapshot Invariant |

### 2.1 Commercial Snapshot Invariant (constitutional)

Once bound to any Subscription:

- Snapshot is permanently immutable and MUST NEVER be modified  
- Snapshot MUST NEVER be reused after the Commercial Plan definition changes  
- Any Commercial Plan change MUST produce a new Snapshot  
- Runtime entitlements resolve **exclusively** from the bound active Snapshot  
- Runtime MUST NEVER resolve entitlements from mutable Catalog data  

### 2.2 Active vs historical (**I-CPL-13**)

| Role | Rule |
|------|------|
| **Active Snapshot** | Exactly one per Subscription at a time |
| **Historical Snapshots** | Immutable, permanently preserved; never overwritten or repointed |
| **Historical Subscriptions** | Continue referencing their historical Snapshot |

| Event | Snapshot action |
|-------|-----------------|
| First activation / trial | Capture + bind + activate (becomes sole active) |
| Upgrade / Downgrade / Migration / Admin plan replacement | **New** Snapshot becomes active; prior preserved historically |
| Renewal (same commercial definition) | **Retain** active Snapshot |
| Renewal requiring new commercial definition | **New** Snapshot becomes active; prior preserved |
| Catalog Deprecate/Retire | **No** Snapshot rewrite or reuse |

---

## 3. Compatibility

Governed by **CC-14** on each Plan Version:

| Field | Role |
|-------|------|
| `upgradeTargets` | Legal upgrade Version ids/codes |
| `downgradeTargets` | Legal downgrade targets |
| `migrationRequirements` | Explicit actions / acknowledgements |
| `breakingCommercialChanges` | Declared breaks (features/limits/price semantics) |

**Selection:** New acquisitions only from **Published** (default).  
**Migration engine (future):** Must enforce CC-14 membership — heuristic plan ordering is non-normative.

---

## 4. Backward compatibility

| Layer | Policy |
|-------|--------|
| **Existing Subscriptions** | Remain on activated Snapshot (**I-CPL-05**) |
| **Deprecated Version** | Backward-compatible for renewals by default |
| **Retired Version** | Backward-compatible only if Retirement Policy allows renewals |
| **Removed features in successor** | Breaking unless grandfather Snapshot still grants them |
| **API/consumers** | Read Snapshot facts; never assume live Catalog equals entitlement |

**Philosophy:** Catalog evolves forward; runtime stays backward-stable via Snapshots.

---

## 5. Migration philosophy

| Kind | Meaning | Owner |
|------|---------|-------|
| **Remain** | Stay on Snapshot; Grandfathered if Version Deprecated/Retired | Subscription + Catalog policy |
| **Upgrade on Renewal** | At renew, offer/require upgrade target | Catalog Migration Policy + Subscription |
| **Automatic** | System migrates at trigger to declared target | Policy + audit |
| **Mandatory** | Block renew until migration completed | Policy |
| **Admin / Customer initiated** | Explicit upgrade/downgrade commands | Subscription commands + CC-14 |

Migration **kinds** are Catalog policy vocabulary; Subscription executes instance transitions and Snapshot supersession.

---

## 6. Plan retirement

| Step | Effect |
|------|--------|
| Deprecate | Soft end-of-sale; messaging; renewals typical |
| Retire | Hard end-of-sale; `allowRenewals` governs renew |
| Archive | Catalog terminal; historical read only |

Retirement **never deletes** Version history (**CC-10**).  
Retirement **never mutates** existing Snapshots.

---

## 7. Grandfathering

| Rule | Detail |
|------|--------|
| **Trigger** | Bound Snapshot references Deprecated or Retired Version |
| **Mode** | Subscription Grandfathered overlay |
| **Entitlements** | Unchanged Snapshot facts |
| **Renewal** | Allowed only per Retirement/Migration policy |
| **Exit** | Migrate to Published successor (new Snapshot) or natural Cancel/Expire |
| **Not** | A Plan Version state named Grandfathered |

---

## 8. Billing-ready versioning (no redesign)

| Future Billing need | Already supported by this strategy |
|---------------------|-------------------------------------|
| Price changes | New Plan Version + optional new Snapshot on renew |
| Proration references | Snapshot amount/cycle facts immutable |
| Invoice line stability | Invoice reads Snapshot/Subscription period facts |
| Tax policy refs | Catalog regional refs frozen into Snapshot contract |

Billing must **not** become Catalog SSOT or mutate Versions post-publish.
