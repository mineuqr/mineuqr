# Scope Model — Deliverable 5

**Program:** RBAC-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Purpose

A **scope** bounds *where* a permission grant is valid.  
Same permission at Platform vs Branch is not the same authority.

```
Grant = Role ∪ Permissions × Scope
```

---

## 2. Canonical scopes

| Scope | Bound | Meaning |
|-------|-------|---------|
| **Platform** | Global MineuQR operator boundary | Cross-tenant platform operations |
| **Organization** | One Organization | All tenants/restaurants under that org (per policy) |
| **Tenant** | One Tenant | All restaurants under that tenant |
| **Restaurant** | One Restaurant | Single venue |
| **Branch** | One Branch | Sub-unit of a restaurant |
| **Own Resource** | Resources linked to principal (creator/assignee) | Instance subset inside a parent scope |
| **Self** | The principal’s own user record | Profile / own credentials only |
| **Custom Scope** (future) | Named attribute set (e.g. region, brand tag) | Policy-defined; must nest under Tenant |

---

## 3. Scope hierarchy

```
Platform
  └── Organization
        └── Tenant
              └── Restaurant
                    └── Branch
                          └── Own Resource  (optional refinement)
Self  ─────────────────────────────── (orthogonal; not a child of Restaurant)
Custom Scope ── must resolve within Tenant (or Org) boundary
```

### Hierarchy laws

| Rule ID | Statement |
|---------|-----------|
| **S-01** | A grant at parent scope **may** authorize actions on child resources **if** the permission allows and policy does not require tighter scope. |
| **S-02** | A grant at child scope **never** authorizes parent-scope actions. |
| **S-03** | Platform scope never implies Organization ownership. |
| **S-04** | Restaurant scope never implies Platform scope. |
| **S-05** | Own Resource and Self never expand beyond their parent evaluation context. |
| **S-06** | Custom scopes cannot escape Tenant (or declared Org) isolation. |
| **S-07** | Effective scope for a request = intersection of membership scope, role assignment scope, and resource’s home scope. |

---

## 4. Scope boundaries explained

### Platform

- Who: Platform Owner, Platform Administrator, Support, CS, Sales, Finance, Auditor (as assigned).  
- What: platform settings, cross-tenant support, catalog governance, security audit.  
- Boundary: **hard wall** from customer tenancy. Support access into a tenant is still **tenant-scoped grant** or audited break-glass — not silent ownership.

### Organization

- Who: Organization Owner / Administrator.  
- What: org settings, tenant portfolio, org-wide membership.  
- Boundary: cannot access other orgs; cannot claim platform powers.

### Tenant

- Commercial / isolation unit.  
- Today’s de facto tenant = Restaurant; target model separates Tenant ⊃ Restaurant.  
- Subscription typically attaches here (or Restaurant — Subscription Platform decides; RBAC only scopes access).

### Restaurant

- Primary operational boundary today and for most permissions.  
- Maps cleanly to current `assertRestaurantAccess` mental model.

### Branch

- Optional refinement when multi-branch venues exist.  
- Branch Manager default scope.  
- Resources without branchId inherit Restaurant scope.

### Own Resource

- Narrows Restaurant/Branch grants to instances the principal created or is assigned.  
- Used for least privilege (e.g. waiter sees own open tickets only) when policy requires.

### Self

- Profile, own password/MFA settings, own notification prefs.  
- Never grants access to tenant business resources.

### Custom Scope (future)

- Examples: “Region North”, “Franchise cluster A”.  
- Implemented as labeled sets of Restaurant/Branch ids under one Tenant/Org.  
- Evaluated as union of member scopes — **no redesign** of core hierarchy.

---

## 5. Scope resolution algorithm (conceptual)

```
1. Resolve resource home: (tenantId, restaurantId?, branchId?)
2. Load principal memberships & role assignments
3. Collect candidate grants where permission P ∈ role.permissions
4. Keep grants where grant.scope covers resource home (hierarchy walk)
5. If Own Resource required: verify principal↔resource link
6. If Self: resourceId must equal principalId
7. Apply denies / suspensions
8. Default deny if no candidate remains
```

---

## 6. Interaction with today’s code (unchanged)

| Today | Future scope equivalent |
|-------|-------------------------|
| `assertAdminAccess` | Platform scope + platform permissions |
| `assertRestaurantAccess` owner path | Restaurant scope + owner role permissions |
| `assertRestaurantAccess` admin bypass | Platform support grant covering that Restaurant (audited) — **not** ownership |

This program does not alter those guards.
