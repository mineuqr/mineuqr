# Migration & Retirement Policies

**Program:** COMMERCIAL-CATALOG-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29  
**Revision:** CC-14 Version Compatibility Governance

---

## 1. Migration is explicit (**CC-09**)

Customers do **not** silently jump Plan Versions when Catalog evolves.

Supported policy *kinds* (Catalog-defined; executed by Subscription Platform future runtime):

| Policy | Behavior |
|--------|----------|
| **Remain on Current Version** | Default — no automatic move |
| **Upgrade on Renewal** | At renewal, bind to a **compatibility-allowed** successor Version |
| **Automatic Upgrade** | Time-boxed or immediate move to allowed successor |
| **Mandatory Migration** | Deadline; after which renewals require allowed new Version |
| **Administrator Initiated Migration** | Support/CS moves Tenant with audit — target must be allowed |
| **Customer Initiated Upgrade** | Self-serve only to **Supported Upgrade Targets** |
| **Customer Initiated Downgrade** | Self-serve only to **Supported Downgrade Targets** |

Migration history must be **auditable** (fromVersion, toVersion, policy, actor, timestamp, reason).

---

## 2. Version Compatibility Governance (**CC-14**)

Commercial evolution does **not** imply universal compatibility.

Every **Published** Plan Version **MUST** explicitly declare:

| Declaration | Required |
|-------------|----------|
| Supported Upgrade Targets | Yes — list of Plan Version ids (may be empty = no self-serve upgrade) |
| Supported Downgrade Targets | Yes — list (may be empty) |
| Migration Requirements | Yes — prerequisites, limit checks, notices |
| Breaking Commercial Changes | Yes — relative to prior Versions (may be “none”) |

### Example

```
Business v2
  Upgrade → Business v3, Business v4
  Downgrade → Starter v5
  NOT → unlimited migration between arbitrary versions
```

| Rule ID | Statement |
|---------|-----------|
| **COMPAT-01** | Migration engine must reject targets outside declared lists. |
| **COMPAT-02** | Empty upgrade/downgrade lists are valid only if explicitly published. |
| **COMPAT-03** | Breaking changes must be visible to Admin before publish (**CC-16**). |
| **COMPAT-04** | Successful migration creates a new Commercial Snapshot (**CC-13**). |

Migration is a **governed business operation**, not an unbounded graph walk.

---

## 3. Retirement policies (**CC-10**)

| Concern | Rule |
|---------|------|
| New subscriptions | Retired Version cannot accept new |
| Renewals | Configurable: allow on Deprecated; block or force migrate on Retired |
| History | Never deleted; always readable |
| Snapshots | Existing Commercial Snapshots remain authoritative (**CC-13**) |
| Successor | Optional UX hint — still subject to **CC-14** allow-lists |

Retirement ≠ deletion.

---

## 4. Sequence — Admin-initiated migration

```
Admin selects Tenant subscription
  → chooses target Plan Version (Published)
  → validate target ∈ Supported Upgrade/Downgrade Targets of source (CC-14)
  → validate Migration Requirements
  → Subscription Platform validates RBAC
  → bind updates to new Plan Version
  → capture new immutable Commercial Snapshot (CC-13)
  → emit MigrationRecord (audit)
  → optional Entitlement Snapshot for in-flight jobs (SP-18)
```

Catalog supplies allowed targets and policy; Subscription performs bind + snapshot.

---

## 5. Sequence — Upgrade on renewal

```
Renewal signal (Billing OOS)
  → Subscription reads Migration Policy on current Version
  → if Upgrade on Renewal: resolve successor from Supported Upgrade Targets only (CC-14)
  → rebind subscription to successor
  → new Commercial Snapshot (CC-13)
  → price from successor Version + cycle (+ regional context CC-15)
  → audit
```

---

## 6. Laws

| Rule ID | Statement |
|---------|-----------|
| **MIG-01** | No implicit version rewrite on publish of N+1. |
| **MIG-02** | Migration always records before/after Version ids. |
| **MIG-03** | Downgrade cannot violate hard limits without Subscription grace policy. |
| **MIG-04** | Catalog defines policy + compatibility; Subscription executes; Billing prices from new Version. |
| **MIG-05** | Arbitrary cross-version moves are forbidden without CC-14 allow-list entry. |
