# Resource Model — Deliverable 4

**Program:** RBAC-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Resource law

| Rule ID | Statement |
|---------|-----------|
| **R-01** | Every permission targets one or more **resource types**. |
| **R-02** | Every resource instance belongs to exactly one **Tenant** boundary (via Restaurant/Org chain). |
| **R-03** | Resource **business ownership** remains with domain platforms; RBAC only classifies them for access. |
| **R-04** | Authorization checks name resource type (+ id when instance-scoped). |
| **R-05** | Creating a new protected capability requires registering its resource type in this model. |

---

## 2. Protected resource catalog

| Resource type | Domain owner (business) | Typical scopes | Notes |
|---------------|-------------------------|----------------|-------|
| **Organization** | Tenant Identity | Organization, Platform | Future entity |
| **Tenant** | Tenant Identity | Organization, Tenant, Platform | Today often = Restaurant |
| **Restaurant** | Tenant Identity / Restaurant domain | Restaurant, Tenant, Platform | Exists |
| **Branch** | Tenant Identity | Branch, Restaurant | Future entity |
| **User Membership** | Tenant Identity | Scope of membership | Future |
| **Platform User** | Identity / User store | Platform, Self | Exists as `users` |
| **Menu** | Menu domain | Restaurant, Branch | Categories/items included |
| **Order** | Order Platform | Restaurant, Branch, Own | Aggregate root |
| **Session** | Session domain | Restaurant, Branch | Table/service session |
| **Check** | Financial Settlement (Check) | Restaurant, Branch | Monetary AR |
| **Payment / Refund** | Financial capabilities | Restaurant (via Check) | Not separate AR; resource for permission targeting |
| **Device** | Device Management Platform | Restaurant, Branch, Platform | Operational devices |
| **Printer** | Printing Platform | Restaurant, Branch | Catalog-owned |
| **Realtime** | Realtime Platform | Restaurant, channel/ACL | Credential + channel as resource facets |
| **Analytics / Reports** | Reporting Platform | Restaurant, Tenant, Org, Platform | Read models |
| **Subscription** | Subscription Platform | Tenant, Restaurant, Platform | Commercial resource |
| **Platform Operations** | Ops platforms | Platform | Jobs, health, diagnostics presentation |
| **Security** | Security / RBAC | Platform, Tenant | Audit, policies |
| **AI** | AI Operations Platform | Scope of caller + resource | Future |
| **Register / Shift** | CRMP | Restaurant, Branch | Custody plane resources |
| **Table (dining)** | Table/Session domain | Restaurant, Branch | Floor resource — not org Branch |

---

## 3. Resource → permission map (summary)

| Resource | Read | Create | Update | Delete | Approve | Export | Manage | Admin |
|----------|:----:|:------:|:------:|:------:|:-------:|:------:|:------:|:-----:|
| Organization | organizations.read | tenants.admin* | organizations.manage | organizations.admin | — | — | organizations.manage | organizations.admin |
| Tenant | tenants.read | tenants.admin | tenants.manage | tenants.admin | — | — | tenants.manage | tenants.admin |
| Restaurant | restaurants.read | restaurants.write | restaurants.write | restaurants.admin | — | — | restaurants.manage | restaurants.admin |
| Branch | branches.read | branches.admin | branches.manage | branches.admin | — | — | branches.manage | branches.admin |
| Menu | menus.read | menus.write | menus.write | menus.admin | — | — | menus.manage | menus.admin |
| Order | orders.read | orders.create | orders.update | —† | orders.approve | — | orders.manage | — |
| Session | sessions.read | sessions.manage | sessions.manage | sessions.manage | — | — | sessions.manage | — |
| Check | checks.read | —‡ | checks.manage | — | checks.approve | — | checks.manage | — |
| Device | devices.read | devices.manage | devices.manage | devices.admin | — | — | devices.manage | devices.admin |
| Printer | printers.read | printers.manage | printers.manage | printers.manage | — | — | printers.manage | — |
| Realtime | realtime.read | realtime.manage | — | realtime.manage | — | — | realtime.manage | — |
| Reports | reports.view | — | — | — | — | reports.export | — | — |
| Analytics | analytics.view | — | — | — | — | analytics.export | — | — |
| Subscription | subscription.read | — | subscription.manage | — | — | — | subscription.manage | subscription.admin |
| Security | security.audit / rbac.read | — | rbac.manage | — | — | security.audit.export | rbac.manage | rbac.admin |
| Platform Ops | platform.settings.read | — | platform.settings.manage | — | — | — | platform.settings.manage | platform.settings.admin |
| AI | ai.read | ai.invoke | ai.manage | — | — | — | ai.manage | ai.admin |

\* Org creation may be platform- or partner-gated.  
† Order delete generally forbidden — cancel/void via manage/approve.  
‡ Checks created by financial flows, not free-form CRUD.

---

## 4. Instance vs type checks

| Check kind | When | Example |
|------------|------|---------|
| **Type + scope** | List/create within boundary | `orders.read` at Restaurant `R1` |
| **Instance** | Mutate specific entity | `orders.manage` on Order `O9` → resolve restaurant/branch → compare scope |
| **Own resource** | Creator/assignee limited | Waiter updates only assigned orders if policy uses Own scope |
| **Self** | Profile only | User updates own profile |

---

## 5. Non-resources (do not authorize as resources)

| Concept | Why excluded |
|---------|--------------|
| UI routes / pages | Presentation; ADR-ARCH-006 |
| Subscription plan SKUs | Entitlement plane |
| Event types | Integration; not access objects |
| Device capability roles | Separate plane |
| KPI formulas | Reporting domain logic |

---

## 6. Extensibility

New platforms register:

1. Resource type id  
2. Owning domain  
3. Allowed scopes  
4. Permission keys  
5. Matrix cells for canonical roles  

Without redesigning the RBAC engine.
