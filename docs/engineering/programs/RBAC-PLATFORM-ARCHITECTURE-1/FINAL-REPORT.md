# FINAL REPORT — RBAC-PLATFORM-ARCHITECTURE-1

**Date:** 2026-07-29  
**Status:** READY FOR ARCHITECTURE AUTHORITY RE-REVIEW  
**Type:** Architecture Design · Architecture Authority mode  
**Revision:** AP-15 Permission Stability · AP-16 Domain Independence  
**Constraints:** Architecture only · No implementation · No API/UI/migration/runtime changes · No commit / push / deploy · **ADR-ARCH-034 not published**  
**Prerequisite:** PLATFORM-P0-PRODUCTION-READINESS-1  

---

## 1. Executive Summary

MineuQR now has a **canonical Enterprise RBAC architecture**: the authorization SSOT for roles, permissions, resources, scopes, assignment policies, and decision semantics — without owning authentication, resource ownership, subscription entitlements, or business logic.

Today’s binary `user` \| `admin` model plus `restaurants.userId` ownership remains **unchanged at runtime**. This program defines the target platform that Tenant Identity, Subscription, AI Operations, and all business domains will follow.

**Hard boundary retained:** Platform governance roles never derive from restaurant ownership or billing state.

**Constitutional additions (this revision):**

| ID | Principle | One-line law |
|----|-----------|--------------|
| **AP-15** | Permission Stability | Permission keys are immutable public contracts; deprecate — never silently rename or reuse. |
| **AP-16** | Domain Independence | Domains evaluate Permissions only; RBAC exclusively owns Role→Permission mapping. |

---

## 2. Architecture Overview

```
AuthN → Tenant Identity (who / owns) → Subscription (entitled?) → RBAC (allowed?) → Domain
```

| Plane | Owner | Question |
|-------|-------|----------|
| Authentication | Auth (OOS) | Authenticated? |
| Identity / Ownership | Tenant Identity | Who / owns what? |
| Entitlement | Subscription | Feature available? |
| **Authorization** | **RBAC Platform** | Permission on resource in scope? |
| Business | Domains | Execute if allowed |

Full diagram and laws: [ARCHITECTURE-OVERVIEW.md](./ARCHITECTURE-OVERVIEW.md).

---

## 3. Identity Model

Entities: **Platform User · Organization · Tenant · Restaurant · Branch · User Membership**.

Ownership hierarchy: Platform → Organization → Tenant → Restaurant → Branch → resources.

RBAC **consumes** membership/ownership; it does **not** duplicate ownership graphs.

Details: [IDENTITY-MODEL.md](./IDENTITY-MODEL.md).

---

## 4. Role Model

Canonical families:

| Family | Roles |
|--------|-------|
| Platform | Platform Owner, Platform Administrator, Support Engineer, Customer Success, Sales, Finance, Auditor |
| Org / Venue admin | Organization Owner, Organization Administrator, Restaurant Owner, Restaurant Administrator |
| Operations | Branch Manager, Supervisor, Cashier, Kitchen, Waiter, Read Only |
| Future | Guest, Partner |

Inheritance is permission-set inclusion **within** family; never across Platform ↔ Tenant boundary.

Details: [ROLE-MODEL.md](./ROLE-MODEL.md).

---

## 5. Permission Catalog

Reusable `{domain}.{resource}.{action}` keys — role-independent (**AP-16**).

Keys are **immutable public contracts** (**AP-15**): deprecate obsolete keys; never silently rename; never reuse for different semantics. Lifecycle: `active` → `deprecated` → `retired`.

Includes: `restaurants.*`, `orders.*`, `reports.view` / `reports.export`, `devices.manage`, `platform.settings.manage`, `subscription.manage`, `security.audit`, `rbac.manage`, `ai.*`, and full domain sets.

Details: [PERMISSION-CATALOG.md](./PERMISSION-CATALOG.md).

---

## 6. Resource Model

Protected types: Organization, Tenant, Restaurant, Branch, Menu, Order, Session, Check, Device, Printer, Realtime, Analytics/Reports, Platform Operations, Security, Subscription, AI, Register/Shift, Membership, Platform User.

Every permission targets registered resources. Domains keep business ownership.

Details: [RESOURCE-MODEL.md](./RESOURCE-MODEL.md).

---

## 7. Scope Model

```
Platform → Organization → Tenant → Restaurant → Branch → Own Resource
Self (orthogonal) · Custom Scope (future, tenant-bound)
```

Child grants never authorize parent actions. Platform ≠ ownership of customer tenants.

Details: [SCOPE-MODEL.md](./SCOPE-MODEL.md).

---

## 8. Authorization Matrix

Complete role × resource × operation matrices (Read/Create/Update/Delete/Approve/Export/Manage/Admin) for platform, org/venue, operations, devices, reporting, subscription, and AI.

Details: [AUTHORIZATION-MATRIX.md](./AUTHORIZATION-MATRIX.md).

---

## 9. Governance Rules

RBAC owns: role definitions, **Role→Permission mapping**, role inheritance, permission catalog (immutable keys), authorization rules, assignment policies, matrix, audit schema.

Domains own: business logic — and **evaluate permissions only** (**AP-16**).  
Identity owns: ownership/membership.  
Subscription owns: entitlements.

Principles: AP-01…**AP-16** — including Least Privilege · Explicit Allow · Default Deny · Immutable Platform Ownership · No UI authz · Server authoritative · Permission-based · **Permission Stability (AP-15)** · **Domain Independence (AP-16)**.

Details: [GOVERNANCE-AND-PRINCIPLES.md](./GOVERNANCE-AND-PRINCIPLES.md).

---

## 10. ADR Recommendations

Recommend **ADR-ARCH-034 — RBAC Platform Architecture** with **AP-15 and AP-16 as mandatory governing principles**.

**Not published** by this program — await Architecture Authority re-acceptance.

Details: [ADR-RECOMMENDATIONS.md](./ADR-RECOMMENDATIONS.md).

---

## 11. Risk Assessment

Highest risk **without** adoption: AI/ops privilege chaos and continued binary over-privilege.  
Highest risk **with** future implementation: migration big-bang — mitigated by dual-read seeding.

Details: [RISK-ASSESSMENT.md](./RISK-ASSESSMENT.md).

---

## 12. Future Roadmap

Architecture → ADR-034 → Tenant Identity architecture → RBAC Foundation (catalog + authorize API + dual-read) → Adoption migrations → Staff membership → Platform role split → AI/token advanced features.

Extensibility (custom roles, groups, temp access, delegation, tokens, partners, org hierarchy) requires **no model redesign**.

Details: [FUTURE-ROADMAP.md](./FUTURE-ROADMAP.md) · [COMPATIBILITY.md](./COMPATIBILITY.md).

---

## Compatibility gate

| Concern | Law |
|---------|-----|
| **AI** | Never bypass; inherit caller; no elevation; server-side; stable permission keys (**AP-15**); no role branching (**AP-16**) |
| **Subscription** | Features ≠ permissions; both required to allow |
| **Tenant Identity** | Ownership ≠ access; no duplicated ownership in RBAC |
| **Permission contracts** | Immutable keys; deprecate — never rename/reuse (**AP-15**) |
| **Domain call sites** | Permissions only; Role→Permission exclusive to RBAC (**AP-16**) |

---

## Success criteria verification

| Criterion | ✓ |
|-----------|---|
| Canonical RBAC architecture | ✓ |
| Clear ownership | ✓ |
| Resource-based authorization | ✓ |
| Scope hierarchy | ✓ |
| Permission catalog | ✓ |
| Role hierarchy | ✓ |
| Authorization matrix | ✓ |
| Future compatibility | ✓ |
| AI compatibility | ✓ |
| Subscription compatibility | ✓ |
| Tenant Identity compatibility | ✓ |
| **AP-15 documented** | ✓ |
| **AP-16 documented** | ✓ |
| All affected documents updated | ✓ |
| ADR-034 recommendation references AP-15 · AP-16 | ✓ |
| Internal consistency preserved | ✓ |
| No implementation / no code / no migrations / no commits | ✓ |
| ADR-ARCH-034 not published | ✓ |

---

## Revision validation

| Check | ✓ |
|-------|---|
| Permission keys documented as immutable contracts | ✓ |
| Deprecated permissions remain historically valid | ✓ |
| Permission reuse explicitly prohibited | ✓ |
| Business Domains never depend on Roles | ✓ |
| RBAC exclusively owns Role→Permission mapping | ✓ |
| No contradictions across documents | ✓ |

---

## Package index

[00-PROGRAM-PACKAGE.md](./00-PROGRAM-PACKAGE.md)

---

## Final verdict

# READY FOR ARCHITECTURE AUTHORITY RE-REVIEW

Documentation revision only.  
No runtime changes.  
No code changes.  
No migrations.  
No commits.  
No deployment.

**Await Architecture Authority re-acceptance before ADR-ARCH-034 publication or any Foundation program.**
