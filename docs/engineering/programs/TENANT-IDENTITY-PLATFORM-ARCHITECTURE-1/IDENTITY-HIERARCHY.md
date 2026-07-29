# Identity Hierarchy — Deliverable 1

**Program:** TENANT-IDENTITY-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29  
**Revision:** RI-01 Identity Lineage

---

## 1. Canonical hierarchy

```
Platform (MineuQR)
  └── Organization
        └── Tenant
              └── Restaurant
                    └── Branch (0..n)
```

Aligned with RBAC-PLATFORM-ARCHITECTURE-1 identity shape. Tenant Identity is the **SSOT** for this graph.

**RI-01:** Each child has exactly one **permanent** parent. Parent-child links are architectural contracts.

---

## 2. Node definitions

| Node | Definition | Cardinality |
|------|------------|-------------|
| **Platform** | Operator root. Not a customer Organization. | Singleton (logical) |
| **Organization** | Customer legal/commercial entity (company, holding, franchise brand HQ). | 1..n under Platform |
| **Tenant** | Isolation boundary for data, ops, and typical commercial attachment. | 1..n under Organization |
| **Restaurant** | Physical or branded operating venue. | 1..n under Tenant |
| **Branch** | Optional operational subdivision (satellite, floor cluster, kiosk group). | 0..n under Restaurant |

### Interim reality (documentation only)

Until Foundation programs ship, MineuQR’s de facto boundary is **Restaurant ≈ Tenant**. Architecture still defines the full hierarchy so adoption can introduce Org/Tenant/Branch without redesign.

---

## 3. Ownership boundaries

| Parent | Owns | Does not own |
|--------|------|--------------|
| Platform | Organizations (lifecycle governance) | Customer business data |
| Organization | Tenants | Cross-org tenants |
| Tenant | Restaurants (+ tenant-scoped resources’ home) | Other tenants’ restaurants |
| Restaurant | Branches (+ venue resources) | Sibling restaurants |
| Branch | Branch-scoped resources only | Parent restaurant identity |

**Law:** Every customer identity node has exactly one permanent parent in the hierarchy (except Platform) — **RI-01**.

---

## 4. Inheritance (structural — not RBAC)

| Kind | Meaning |
|------|---------|
| **Containment / lineage** | Child exists only under its **permanent** parent; parent never rewritten on the same ID |
| **Isolation inheritance** | Child inherits parent’s Tenant boundary for data isolation |
| **Reference inheritance** | Knowing a Branch implies resolvable Restaurant → Tenant → Organization |
| **Not inherited** | Permissions (RBAC), entitlements (Subscription), display names |

Accountable-user transfer does **not** move hierarchy parents. Restructuring uses **controlled migration** (new IDs under new parents; archive old) — never silent reparenting (**RI-01**).

---

## 5. Identity propagation

```
Branch.canonicalId
  → resolves → Restaurant.canonicalId
    → resolves → Tenant.canonicalId
      → resolves → Organization.canonicalId
        → under → Platform
```

Resolution of this chain is performed **only** by the Tenant Identity Platform (**RI-03**).

| Rule ID | Statement |
|---------|-----------|
| **IH-01** | Every protected business resource homes to exactly one Tenant (via Restaurant/Branch chain). |
| **IH-02** | Propagation is read-only resolution — children do not mint parent identities. |
| **IH-03** | Canonical identity parent links are **immutable**; reparenting the same ID is forbidden (**RI-01**). |
| **IH-04** | Cross-tenant links between peer Tenants are forbidden unless an explicit Partner/Marketplace relation is introduced later. |
| **IH-05** | Platform Users are not hierarchy children of Restaurants; they attach via Membership. |
| **IH-06** | Enterprise restructuring uses Architecture-approved migration — not identity reassignment. |

---

## 6. Related non-hierarchy identities

| Identity | Relationship |
|----------|--------------|
| Platform User | Membership bindings at Org/Tenant/Restaurant/Branch |
| Operational Device | Binds to Restaurant (+ optional Branch); Device Management owns device ID |
| Partner / Reseller (future) | May manage Organizations under contract — lineage of each ID remains fixed |

---

## 7. Propagation to consumers

| Consumer | Receives |
|----------|----------|
| RBAC | Scope ids = canonical identity ids at Org/Tenant/Restaurant/Branch |
| Subscription | Attachment point = typically Tenant (or Restaurant interim) |
| Domains | **Canonical IDs only** — never resolve via name/slug/ops number (**RI-03**) |
| Support tools | Operational numbers as **human labels** + canonical ids (**ON-LAW**) |
| AI | Canonical ids only; respects Tenant boundary |
| External / QR / webhooks | Bound to canonical identity (**RI-02**) |
