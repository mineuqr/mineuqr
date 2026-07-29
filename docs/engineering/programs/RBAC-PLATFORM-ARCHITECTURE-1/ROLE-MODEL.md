# Role Model — Deliverable 2

**Program:** RBAC-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Role philosophy

| Principle | Statement |
|-----------|-----------|
| Roles are **bundles of permissions** | Never encode business rules as role names in domain code (**AP-16**) |
| Roles are **scope-bound** | Same role name at different scopes ≠ same authority |
| Roles avoid duplicate authority | One responsibility per role; compose via multiple role assignments if needed |
| Platform roles ≠ tenant roles | Hard boundary — tenant ownership never grants platform governance |
| Future custom roles | Allowed as permission subsets within tenant policy — never exceed granter |
| Role→Permission mapping | Owned **exclusively** by the RBAC Platform (**AP-16**); domains never evaluate roles |

---

## 2. Role families

```
PLATFORM FAMILY          TENANT / ORG FAMILY         VENUE OPERATIONS FAMILY
─────────────────        ───────────────────         ───────────────────────
Platform Owner           Organization Owner          Branch Manager
Platform Administrator   Organization Administrator  Supervisor
Support Engineer         Restaurant Owner            Cashier
Customer Success         Restaurant Administrator    Kitchen
Sales                                                Waiter
Finance                  ── shared ──                Read Only
Auditor                  Read Only (scoped)
                         Guest (future)
                         Partner (future)
```

---

## 3. Canonical roles — Platform family

### 3.1 Platform Owner

| | |
|--|--|
| **Purpose** | Immutable highest governance authority for MineuQR |
| **Responsibilities** | Platform constitution, protected-account policy, operator promotion, RBAC catalog ratification, break-glass, plan-policy governance |
| **Must not** | Be deletable / demotable via normal admin UI; be auto-created from restaurant ownership |
| **Inheritance** | Superset of Platform Administrator for platform governance permissions; does **not** replace tenant Owner roles (cross-tenant access is explicit support power, audited) |
| **Maps from today** | Protected primary operator (`users.role=admin` + protected account) |

### 3.2 Platform Administrator

| | |
|--|--|
| **Purpose** | Day-to-day platform operations |
| **Responsibilities** | Tenant support tools, user administration (non-owner), platform settings (non-constitutional), operational dashboards |
| **Must not** | Create/demote Platform Owners; alter protected-account registry; redefine RBAC constitution without Owner |
| **Maps from today** | `users.role=admin` (non-protected) |

### 3.3 Support Engineer

| | |
|--|--|
| **Purpose** | Technical customer support with least privilege |
| **Responsibilities** | Read tenant health, devices, diagnostics; limited impersonation/support actions under policy; escalate |
| **Must not** | Manage billing policy; promote platform roles; mutate financial truth |

### 3.4 Customer Success

| | |
|--|--|
| **Purpose** | Onboarding and account health |
| **Responsibilities** | Read commercial/tenant status; guide configuration; limited non-destructive support writes |
| **Must not** | Full cross-tenant mutate; security policy; RBAC catalog |

### 3.5 Sales

| | |
|--|--|
| **Purpose** | Pre-sales / commercial pipeline visibility |
| **Responsibilities** | Read limited commercial metadata; prospect tooling (future) |
| **Must not** | Access operational order/check data beyond policy; change subscriptions without Finance/CS rules |

### 3.6 Finance

| | |
|--|--|
| **Purpose** | Platform commercial / revenue operations |
| **Responsibilities** | Subscription adjustments per policy; invoices/refunds commercial; MRR views |
| **Must not** | Platform Owner promotion; restaurant operational control; security audit purge |

### 3.7 Auditor

| | |
|--|--|
| **Purpose** | Independent read-only oversight |
| **Responsibilities** | `security.audit` reads; compliance exports; configuration review |
| **Must not** | Mutate any resource; assign roles |

---

## 4. Canonical roles — Organization / Tenant family

### 4.1 Organization Owner

| | |
|--|--|
| **Purpose** | Legal/commercial head of customer Organization |
| **Responsibilities** | Org settings; create/manage Tenants; assign Organization Administrators; billing identity linkage |
| **Must not** | Platform governance |

### 4.2 Organization Administrator

| | |
|--|--|
| **Purpose** | Org-wide IT / ops without ownership transfer |
| **Responsibilities** | Manage org memberships; configure tenants under policy; org-scoped reports |
| **Must not** | Transfer org ownership; platform access |

### 4.3 Restaurant Owner

| | |
|--|--|
| **Purpose** | Venue ownership authority (maps to today’s `restaurants.userId` owner) |
| **Responsibilities** | Full venue admin; staff assignment; subscription self-service for owned venues (subject to Subscription plane); transfer ownership (policy-bound) |
| **Must not** | Platform `/admin` governance; other tenants’ venues |

### 4.4 Restaurant Administrator

| | |
|--|--|
| **Purpose** | Day-to-day venue administration without ownership |
| **Responsibilities** | Menu, devices, staff (non-owner), settings, reports for assigned restaurants |
| **Must not** | Ownership transfer; org-level billing; platform access |

---

## 5. Canonical roles — Venue operations family

### 5.1 Branch Manager

| | |
|--|--|
| **Purpose** | Operate one Branch |
| **Responsibilities** | Branch staff oversight; branch orders/sessions/devices; branch reports |
| **Must not** | Cross-branch admin unless separately granted; subscription manage |

### 5.2 Supervisor

| | |
|--|--|
| **Purpose** | Shift leadership |
| **Responsibilities** | Approvals (voids/comps/refunds per permission); supervise cashiers/waiters; limited reports |
| **Must not** | Menu catalog redesign; device fleet admin; RBAC manage |

### 5.3 Cashier

| | |
|--|--|
| **Purpose** | Settlement / register operations |
| **Responsibilities** | Orders/checks payment flows; register duty actions per CRMP; receipts |
| **Must not** | Refund beyond granted permissions; staff admin; reports export (unless granted) |

### 5.4 Kitchen

| | |
|--|--|
| **Purpose** | Kitchen production |
| **Responsibilities** | Kitchen order read/update fulfilment states; kitchen display ops |
| **Must not** | Payments; menu price edits; admin settings |

### 5.5 Waiter

| | |
|--|--|
| **Purpose** | Floor service |
| **Responsibilities** | Create/update orders for assigned scope; table session ops; send to kitchen |
| **Must not** | Settlement admin; device manage; reports export |

### 5.6 Read Only

| | |
|--|--|
| **Purpose** | View-only access at assigned scope |
| **Responsibilities** | Read permitted resources; no mutations |
| **Must not** | Any write / approve / manage / admin |

### 5.7 Guest (future)

| | |
|--|--|
| **Purpose** | Unauthenticated or lightly authenticated consumer |
| **Responsibilities** | Public menu browse; place self-order; track own order |
| **Must not** | Staff surfaces; cross-order access |

### 5.8 Partner (future)

| | |
|--|--|
| **Purpose** | External integrator / marketplace partner |
| **Responsibilities** | Scoped API access to contracted resources |
| **Must not** | Broad tenant admin; platform governance |

---

## 6. Inheritance model

Inheritance is **permission-set inclusion within a family**, not automatic cross-tenant power.

```
Platform Owner ⊇ Platform Administrator  (platform governance permissions)
Organization Owner ⊇ Organization Administrator  (org scope)
Restaurant Owner ⊇ Restaurant Administrator  (restaurant scope)
Branch Manager ⊇ Supervisor ⊇ (Cashier | Waiter | Kitchen)   [operational inclusion — optional composition]
Read Only ⊆ any role’s read permissions at same scope (not a parent)
```

### Inheritance laws

| Rule ID | Statement |
|---------|-----------|
| **RH-01** | Inheritance never crosses the Platform ↔ Tenant hard boundary. |
| **RH-02** | Restaurant Owner does **not** inherit Platform Administrator. |
| **RH-03** | Platform Administrator cross-tenant access is an **explicit support grant**, not ownership. |
| **RH-04** | Prefer **composition** (multiple roles) over mega-roles when duties differ (e.g. Cashier + Waiter). |
| **RH-05** | Custom roles may only be subsets of permissions the creator can grant at that scope. |

---

## 7. Avoiding duplicate authority

| Anti-pattern | Resolution |
|--------------|------------|
| “Admin” meaning both platform and restaurant | Split Platform Administrator vs Restaurant Administrator |
| Owner implied by subscription | Ownership ≠ entitlement ≠ role |
| Device role = human role | Keep device capability plane separate |
| UI route name as role (`/super-admin`) | Roles are data; routes consume permissions |
| CRMP duty operator as RBAC role | Duty is operational context; authorization still permission-based |

---

## 8. Mapping from current binary model (migration reference only)

| Today | Target seed mapping |
|-------|---------------------|
| Protected `admin` | Platform Owner |
| Other `admin` | Platform Administrator (refine later into Support/CS/Finance via assignments) |
| `user` + `restaurants.userId` | Restaurant Owner at each owned restaurant |
| Unmodeled staff | Membership + operational roles (future) |
| Device roles | Unchanged device plane |

**No runtime remapping in this program.**
