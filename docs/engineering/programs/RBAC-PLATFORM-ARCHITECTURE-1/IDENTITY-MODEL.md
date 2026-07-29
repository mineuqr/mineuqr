# Identity Model — Deliverable 1

**Program:** RBAC-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

> **Ownership note:** Identity and ownership entities are **owned by Tenant Identity Platform** (future). RBAC **consumes** identity facts and membership bindings. This document defines the identity **shape** required for authorization — it does not implement Tenant Identity.

---

## 1. Canonical entities

| Entity | Definition | Current MineuQR mapping |
|--------|------------|-------------------------|
| **Platform User** | Human (or future machine) account principal in the platform | `users` row |
| **Organization** | Commercial / legal grouping that may own multiple tenants | **Not modeled** (target) |
| **Tenant** | Billing / commercial / isolation boundary under an Organization | Today ≈ restaurant row as de facto tenant; target: explicit Tenant |
| **Restaurant** | Operating venue (brand location) under a Tenant | `restaurants` |
| **Branch** | Optional sub-unit of a Restaurant (floor / satellite / kiosk cluster) | `operational_devices.branchId` only — **no entity** (target) |
| **User Membership** | Binding of a Platform User to an Organization / Tenant / Restaurant / Branch with role assignment(s) | **Not modeled** (target) |

---

## 2. Identity relationships

```
Platform User ──◄membership►── Organization
                                    │
                                    owns (1..n)
                                    ▼
                                  Tenant
                                    │
                                    contains (1..n)
                                    ▼
                               Restaurant
                                    │
                                    contains (0..n)
                                    ▼
                                  Branch

Platform User ──◄membership►── Tenant / Restaurant / Branch
Platform User ──◄ownership►─── Restaurant (legacy today: restaurants.userId)
```

### Relationship rules

| Rule ID | Statement |
|---------|-----------|
| **ID-01** | Every protected resource is owned within exactly one Tenant boundary. |
| **ID-02** | Restaurant belongs to exactly one Tenant (today: restaurant *is* the tenant boundary). |
| **ID-03** | Branch belongs to exactly one Restaurant. |
| **ID-04** | Organization may own many Tenants; Tenant belongs to exactly one Organization (when Org is introduced). |
| **ID-05** | Platform User may hold many Memberships across scopes; Memberships never imply platform governance. |
| **ID-06** | Platform governance authority is **not** inferred from restaurant count, ownership, or subscription. |
| **ID-07** | Device principals are not Platform Users; they bind to Restaurant (and optional Branch) separately. |

---

## 3. Ownership hierarchy

```
Platform (MineuQR operator)
  └── Organization (customer company)
        └── Tenant (commercial isolation unit)
              └── Restaurant (venue)
                    └── Branch (optional sub-venue)
                          └── Resources (Menu, Order, Device, …)
```

### Ownership vs access

| Concern | Owner plane | Example |
|---------|-------------|---------|
| Who **owns** the restaurant | Tenant Identity | `ownerUserId` / org ownership link |
| Who **may manage** the restaurant | RBAC | role + `restaurants.manage` at Restaurant scope |
| Who **pays** for features | Subscription | plan on Tenant / Restaurant |

**Law:** Ownership is not a permission. Ownership may **imply** a default role grant (e.g. Restaurant Owner), but access decisions still flow through RBAC.

---

## 4. User Membership

A Membership is the atomic grant surface for tenant-side RBAC.

| Field (conceptual) | Purpose |
|--------------------|---------|
| `membershipId` | Stable id |
| `userId` | Platform User |
| `scopeType` | `organization` \| `tenant` \| `restaurant` \| `branch` |
| `scopeId` | Target entity id |
| `roleIds[]` | Assigned canonical (or custom) roles |
| `status` | `active` \| `suspended` \| `invited` \| `revoked` |
| `validFrom` / `validTo` | Supports temporary access |
| `grantedBy` / `grantedAt` | Audit |
| `delegatedFrom` | Optional delegation chain |

### Membership laws

| Rule ID | Statement |
|---------|-----------|
| **MEM-01** | No membership ⇒ no tenant-scoped access (default deny). |
| **MEM-02** | Platform roles are assigned via **platform authority binding**, not restaurant membership. |
| **MEM-03** | Membership scope must be ≤ the granter’s scope (no upward grant). |
| **MEM-04** | Soft-delete / revoke memberships; never silently reuse. |
| **MEM-05** | Suspended user or membership ⇒ effective deny for that scope. |

---

## 5. Platform User

| Attribute class | Examples | Notes |
|-----------------|----------|-------|
| Identity | id, email, display name, locale | Auth/profile owned elsewhere |
| Classification | `COMMERCIAL` \| `INTERNAL` \| `SYSTEM` | Orthogonal to RBAC (exists today) |
| Platform authority | none \| operator tiers \| owner | Platform governance plane |
| Status | active / suspended / deleted | Affects all grants |

**Platform User ≠ Restaurant Owner by default.** Ownership is a Tenant Identity fact that typically triggers an Organization/Restaurant Owner role assignment.

---

## 6. Migration posture (architecture only)

| Phase | Identity reality | Authorization reality |
|-------|------------------|------------------------|
| **Today (unchanged)** | User owns Restaurant via `userId` | Binary admin / owner check |
| **Interim** | Same + optional membership table | Dual-read: ownership maps to Restaurant Owner role |
| **Target** | Org → Tenant → Restaurant → Branch + Memberships | Pure RBAC decision engine |

This program defines Target. Interim migration is a **future implementation program**.

---

## 7. What RBAC stores vs consumes

| Fact | Stored by | Consumed by RBAC as |
|------|-----------|---------------------|
| User exists | Tenant Identity / User store | Principal id |
| Owns restaurant | Tenant Identity | Scope resolution + default role seed |
| Membership + roles | Tenant Identity (binding) + RBAC (role defs) | Effective role set |
| Permission catalog | **RBAC** | Decision input |
| Role definitions | **RBAC** | Decision input |
| Assignment policy | **RBAC** | Who may assign what |
