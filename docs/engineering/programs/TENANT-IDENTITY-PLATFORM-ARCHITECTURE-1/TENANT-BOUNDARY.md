# Tenant Boundary & Isolation — Deliverable 8

**Program:** TENANT-IDENTITY-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Isolation root

The **Tenant** is the primary **data and operational isolation boundary**.

```
Organization  → portfolio / legal grouping (may contain multiple Tenants)
Tenant        → isolation wall (default deny across peers)
Restaurant    → venue within Tenant
Branch        → optional subdivision within Restaurant
```

Until Tenant entity exists in runtime, **Restaurant acts as interim isolation root** — architecture still targets Tenant.

---

## 2. Mandatory boundaries

| Boundary | Rule |
|----------|------|
| **Cross-tenant visibility** | Default **deny**. No peer Tenant reads another’s resources. |
| **Organization isolation** | Org A cannot see Org B’s Tenants absent Platform/Partner grant. |
| **Restaurant isolation** | Within a Tenant, Restaurant scope may further restrict (RBAC); data still Tenant-homed. |
| **Branch isolation** | Branch scope may further restrict; cannot escape Restaurant/Tenant. |
| **Platform administration** | Platform roles may operate cross-tenant only via **RBAC support grants** — not by owning customer Tenants. |
| **Support access** | Audited, time-bounded, permission-based (RBAC); Identity does not grant support by ownership hack. |

---

## 3. Visibility matrix (identity-level)

| Actor | Own Tenant | Sibling Tenant same Org | Other Org | Platform ops |
|-------|:----------:|:-----------------------:|:---------:|:------------:|
| Tenant staff (membership) | ✓ scoped | ✗ default | ✗ | ✗ |
| Org admin | ✓ org Tenants | ✓ org Tenants | ✗ | ✗ |
| Platform support | ✓ with RBAC grant | ✓ with grant | ✓ with grant | ✓ |
| Platform Owner | ✓ with RBAC | ✓ with RBAC | ✓ with RBAC | ✓ |
| AI as caller | ⊆ caller Tenant scope | ✗ | ✗ | ✗ |
| Partner (future) | Contract scope only | Per contract | Per contract | ✗ |

Identity defines **where** the wall is; RBAC defines **who** may cross with grants.

---

## 4. Isolation laws

| Rule ID | Statement |
|---------|-----------|
| **ISO-01** | Every business resource declares a Tenant home (directly or via Restaurant/Branch). |
| **ISO-02** | Queries/commands must be Tenant-scoped unless Platform scope authorize allows. |
| **ISO-03** | Sharing across Tenants requires an explicit relation object (future) — not silent FK joins. |
| **ISO-04** | Suspended/Archived Tenants remain isolation walls; status ≠ permission to leak. |
| **ISO-05** | Operational numbers must not enable cross-tenant data access without authz. |

---

## 5. Platform vs customer

```
════════════════════ PLATFORM ════════════════════
  Platform administration / support (RBAC)
════════════════════ HARD WALL ═══════════════════
  Organization / Tenant / Restaurant / Branch
══════════════════════════════════════════════════
```

Aligned with RBAC Platform ↔ Tenant hard boundary.
