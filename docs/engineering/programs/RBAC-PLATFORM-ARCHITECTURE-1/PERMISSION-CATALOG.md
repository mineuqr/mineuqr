# Permission Catalog — Deliverable 3

**Program:** RBAC-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Catalog laws

| Rule ID | Statement |
|---------|-----------|
| **P-01** | Permissions are **reusable** strings: `{resource}.{action}` (optional qualifier). |
| **P-02** | Permissions are **role-independent** — never `cashier.only.*` (**AP-16**). |
| **P-03** | Permissions name **capability**, not UI screens. |
| **P-04** | Every permission targets one or more **resource types**. |
| **P-05** | New modules add permissions to the catalog; they do not invent ad-hoc checks. |
| **P-06** | Feature availability is **not** a permission (Subscription plane). |
| **P-07** | Permission identifiers are **immutable public contracts** (**AP-15**). |
| **P-08** | Obsolete permissions are marked `deprecated`; keys are never silently renamed. |
| **P-09** | Deprecated / retired keys must **never** be reused for different semantics. |
| **P-10** | New semantics require a **new** key; consumers migrate deliberately (program + dual-read as needed). |

### Naming convention

```
<domain>.<resource>.<action>
```

Examples: `restaurants.read`, `orders.manage`, `reports.export`, `platform.settings.manage`

Actions vocabulary (canonical): `read` · `create` · `update` · `delete` · `approve` · `export` · `manage` · `admin`

- `manage` = operational control short of constitutional admin  
- `admin` = configuration / membership / destructive policy within resource domain  

### Permission stability lifecycle (**AP-15**)

| Status | Meaning | Allowed operations |
|--------|---------|-------------------|
| `active` | Current contract | Grant, authorize, document |
| `deprecated` | Obsolete; still historically valid | Authorize for existing grants; no new grants preferred; point to successor |
| `retired` | Removed from grantable set after migration program | Audit/history only; authorize deny for new use |

**Forbidden:** silent rename · in-place semantic change · recycling a key for a different meaning.

Catalog versioning records additions and status transitions — **not** key renames as a normal operation.

## 2. Catalog by domain

### 2.1 Platform governance

| Permission | Description | Primary resources |
|------------|-------------|-------------------|
| `platform.settings.read` | View platform settings | Platform Operations |
| `platform.settings.manage` | Change non-constitutional platform settings | Platform Operations |
| `platform.settings.admin` | Constitutional platform configuration | Platform Operations |
| `platform.users.read` | List/search platform users | Platform User |
| `platform.users.manage` | Suspend / update non-owner users | Platform User |
| `platform.users.admin` | Promote/demote platform authority (policy-bound) | Platform User |
| `platform.tenants.read` | Cross-tenant directory read | Tenant |
| `platform.tenants.manage` | Support actions on tenants | Tenant |
| `rbac.read` | View roles/assignments | Security / RBAC |
| `rbac.manage` | Assign roles within policy | Security / RBAC |
| `rbac.admin` | Edit role/permission catalog (Owner-tier) | Security / RBAC |
| `security.audit` | Read security/audit trails | Security |
| `security.audit.export` | Export audit data | Security |

### 2.2 Organization / Tenant

| Permission | Description | Primary resources |
|------------|-------------|-------------------|
| `organizations.read` | View organization | Organization |
| `organizations.manage` | Update org profile/settings | Organization |
| `organizations.admin` | Ownership transfer / org dissolve policy | Organization |
| `tenants.read` | View tenant | Tenant |
| `tenants.manage` | Configure tenant | Tenant |
| `tenants.admin` | Create/archive tenant under org | Tenant |
| `memberships.read` | View memberships | User Membership |
| `memberships.manage` | Invite/assign/revoke within grant scope | User Membership |
| `memberships.admin` | Override membership policy | User Membership |

### 2.3 Restaurant / Branch

| Permission | Description | Primary resources |
|------------|-------------|-------------------|
| `restaurants.read` | View restaurant | Restaurant |
| `restaurants.write` | Create/update restaurant profile | Restaurant |
| `restaurants.manage` | Operational restaurant administration | Restaurant |
| `restaurants.admin` | Ownership / destructive restaurant admin | Restaurant |
| `branches.read` | View branches | Branch |
| `branches.manage` | Configure branches | Branch |
| `branches.admin` | Create/archive branches | Branch |

### 2.4 Menu

| Permission | Description | Primary resources |
|------------|-------------|-------------------|
| `menus.read` | View menus/categories/items | Menu |
| `menus.write` | Edit menu content | Menu |
| `menus.manage` | Publish/unpublish, structure | Menu |
| `menus.admin` | Menu policy / destructive reset | Menu |

### 2.5 Orders / Sessions / Checks

| Permission | Description | Primary resources |
|------------|-------------|-------------------|
| `orders.read` | View orders | Order |
| `orders.create` | Place/create orders | Order |
| `orders.update` | Modify non-settled order state | Order |
| `orders.manage` | Operational order control (route, cancel per policy) | Order |
| `orders.approve` | Approve restricted order actions | Order |
| `sessions.read` | View table/service sessions | Session |
| `sessions.manage` | Open/close/transfer sessions | Session |
| `checks.read` | View checks | Check |
| `checks.manage` | Check operational actions | Check |
| `checks.approve` | Approve voids/comps/refunds (financial gate) | Check |
| `payments.manage` | Tender / settlement execution | Check / Payment |
| `refunds.create` | Initiate refund request | Check / Refund |
| `refunds.approve` | Approve refund | Check / Refund |
| `refunds.manage` | Refund operational workflow | Check / Refund |

### 2.6 Kitchen / Floor ops

| Permission | Description | Primary resources |
|------------|-------------|-------------------|
| `kitchen.read` | View kitchen tickets | Order / Kitchen |
| `kitchen.manage` | Update kitchen fulfilment | Order / Kitchen |
| `floor.read` | View floor/tables state | Session / Tables |
| `floor.manage` | Floor operational updates | Session / Tables |

### 2.7 Devices / Printers / Realtime

| Permission | Description | Primary resources |
|------------|-------------|-------------------|
| `devices.read` | View devices | Device |
| `devices.manage` | Register/assign/configure devices | Device |
| `devices.admin` | Retire/revoke device trust | Device |
| `printers.read` | View printers | Printer |
| `printers.manage` | Configure printers | Printer |
| `realtime.read` | Subscribe to authorized channels | Realtime |
| `realtime.manage` | Mint/revoke staff realtime credentials | Realtime |

### 2.8 Reporting / Analytics

| Permission | Description | Primary resources |
|------------|-------------|-------------------|
| `reports.view` | View reports dashboards | Analytics / Reports |
| `reports.export` | Export report data | Analytics / Reports |
| `analytics.view` | View analytics surfaces | Analytics |
| `analytics.export` | Export analytics | Analytics |

### 2.9 Subscription (permission to *operate* subscription tools — not feature entitlement)

| Permission | Description | Primary resources |
|------------|-------------|-------------------|
| `subscription.read` | View subscription status | Subscription |
| `subscription.manage` | Change plan/seats within self-service policy | Subscription |
| `subscription.admin` | Platform-side subscription overrides | Subscription |

### 2.10 AI Operations

| Permission | Description | Primary resources |
|------------|-------------|-------------------|
| `ai.read` | View AI insights/history | AI |
| `ai.invoke` | Invoke AI actions as caller | AI |
| `ai.manage` | Configure AI ops settings | AI |
| `ai.admin` | Platform AI policy | AI |

---

## 3. Permission groups (extensibility — not roles)

Optional named bundles for UX / custom roles — **still expand to atomic permissions at decision time**.

| Group (example) | Members (example) |
|-----------------|-------------------|
| `group.venue.read` | `restaurants.read`, `menus.read`, `orders.read`, `reports.view` |
| `group.venue.ops` | orders/sessions/checks manage set |
| `group.venue.admin` | restaurants.manage, memberships.manage, devices.manage |
| `group.finance.ops` | checks.approve, refunds.*, reports.export |
| `group.platform.support` | platform.tenants.read, devices.read, security.audit |

---

## 4. Anti-patterns (forbidden)

| Forbidden | Why |
|-----------|-----|
| `role.cashier.refund` | Role-specific permission (**AP-16**) |
| `page.dashboard.access` | UI-coupled |
| `feature.premium.reports` | Subscription concern |
| Implicit “admin can do everything” without catalog entries | Breaks audit & least privilege |
| Silent rename of `orders.manage` → `orders.operate` | Violates **AP-15** |
| Reusing deprecated `reports.view` for a different meaning | Violates **AP-15** |
| Domain `if (role === 'cashier')` before refund | Violates **AP-16** |

---

## 5. Decision API shape (conceptual — not implemented)

```
authorize({
  principalId,
  permission,      // e.g. "orders.manage" — immutable contract key (AP-15)
  resourceType,    // e.g. "order"
  resourceId?,     // optional instance
  scope,           // { type, id }
}) → { allow: boolean, reasonCode, matchedRoleIds?, auditId }
```

Business domains call this (or a thin guard wrapper) with a **permission** only (**AP-16**). They **never** switch on role name. Role→Permission expansion happens solely inside the RBAC Platform.
