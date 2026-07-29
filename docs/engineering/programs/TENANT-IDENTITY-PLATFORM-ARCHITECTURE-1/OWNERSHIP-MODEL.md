# Ownership Model — Deliverable 5

**Program:** TENANT-IDENTITY-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29  
**Revision:** RI-01 Identity Lineage

---

## 1. Ownership chain (normative)

```
Platform owns Organizations
Organizations own Tenants
Tenants own Restaurants
Restaurants own Branches
```

| Rule ID | Statement |
|---------|-----------|
| **OWN-01** | Every Organization has Platform as ultimate root. |
| **OWN-02** | Every Tenant has exactly one Organization owner — **permanent lineage** (**RI-01**). |
| **OWN-03** | Every Restaurant has exactly one Tenant owner — **permanent lineage** (**RI-01**). |
| **OWN-04** | Every Branch has exactly one Restaurant owner — **permanent lineage** (**RI-01**). |
| **OWN-05** | Ownership is never ambiguous — dual-parent containment is forbidden. |
| **OWN-06** | Business resources home under exactly one Tenant via the chain. |
| **OWN-07** | Hierarchy parent of a canonical ID is never mutated in normal operations (**RI-01**). |

---

## 2. Two distinct concepts (must not conflate)

| Concept | Mutates lineage? | Allowed |
|---------|------------------|---------|
| **Hierarchy / lineage ownership** (parent in Platform→…→Branch) | Would reparent | **No** — immutable except Architecture-approved migration |
| **Accountable / beneficial owner** (designated user, membership) | No | **Yes** — transfer user responsibility; IDs & parents unchanged |
| **Commercial payer** (Subscription) | No | Linked explicitly; never implies hierarchy move |

**Law:** Ownership ≠ permission. Accountable-owner transfer ≠ identity reparenting.

---

## 3. What hierarchy “owns” means

| Meaning | Includes | Excludes |
|---------|----------|----------|
| **Containment / lineage** | Permanent parent link; lifecycle cascade | Automatic RBAC permissions |
| **Commercial attachment point** | Where Subscription typically binds (Tenant) | Creating plans |
| **Data isolation root** | Tenant boundary for resources | Cross-tenant visibility |

---

## 4. Accountable-party transfer (allowed)

| Transfer | Effect on Canonical IDs | Effect on lineage (parent) | Effect on operational numbers |
|----------|-------------------------|----------------------------|-------------------------------|
| Designated owner user change | Stable | **Unchanged** | Stable |
| Membership reassignment | Stable | **Unchanged** | Stable |

Audited. Emits Identity events so RBAC may re-seed roles — **without** changing parent links.

---

## 5. Identity relocation / restructuring (**RI-01**)

**Forbidden as normal operations**

- Reassign Restaurant canonical ID to a different Tenant parent  
- Reassign Tenant to a different Organization parent  
- Reassign Branch to a different Restaurant parent  
- “Move” an identity by rewriting its parent pointer  

**Allowed only via platform-approved migration procedures**

| Pattern | Description |
|---------|-------------|
| Controlled migration | Architecture Authority–approved program |
| Required approach | Mint **new** identities under the target parent; migrate business references; **archive** source identities |
| Source IDs | Retain original lineage forever; never reused; **never reparented** |
| External refs | Cut over to new canonical IDs deliberately; old IDs remain reserved (**RI-02** continuity planning) |

**Same-ID parent mutation is never a valid migration technique.**

Enterprise restructuring (franchise sale, holding carve-out) uses **migration**, not identity reassignment.

---

## 6. Interim mapping (today → target)

| Today | Target ownership |
|-------|------------------|
| `restaurants.userId` | Accountable owner + Membership; Restaurant under Tenant under Organization |
| No Org/Tenant rows | Introduce without changing Restaurant canonical identity once minted |
| Device `branchId` | Branch entity with permanent Restaurant parent |

No schema work in this program.

---

## 7. Ambiguity ban

Forbidden patterns:

- Restaurant owned by two Tenants  
- Tenant without Organization  
- Branch floating without Restaurant  
- Inferring hierarchy from subscription payer alone  
- Inferring hierarchy from “first admin user” heuristics  
- Silent reparenting disguised as “ownership transfer”  

---

## 8. Platform ownership of Organizations

Platform **governs** Organization lifecycle (create/suspend under policy) but does **not** own customer business data inside Tenants. Support access is RBAC, not hierarchy transfer.
