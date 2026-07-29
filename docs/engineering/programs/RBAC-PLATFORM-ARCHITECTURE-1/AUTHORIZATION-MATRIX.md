# Authorization Matrix — Deliverable 6

**Program:** RBAC-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

**Constitutional notes**

| Principle | Matrix implication |
|-----------|-------------------|
| **AP-15** Permission Stability | Cells resolve to **stable permission keys** from the catalog. Deprecations update notes / successors — keys are not silently renamed or reused. |
| **AP-16** Domain Independence | This matrix is an **RBAC Platform artifact**. Domains never import role rows; they evaluate the resulting permissions only. Role→Permission mapping stays exclusive to RBAC. |

**Legend**

| Symbol | Meaning |
|--------|---------|
| **F** | Full — allowed for resource class at role’s default scope |
| **L** | Limited — allowed with tighter policy (Own Resource, approve thresholds, support-only, or read-subset) |
| **—** | Denied by default |
| Scope column | Default evaluation scope for the role |

Operations: **R**ead · **C**reate · **U**pdate · **D**elete · **A**pprove · **E**xport · **M**anage · **Ad**min

Each operation cell maps to catalog permission keys (e.g. Read→`*.read` / `reports.view`, Manage→`*.manage`). Those keys are immutable contracts (**AP-15**).

---

## 1. Platform family × platform / security resources

| Role | Default scope | Platform Ops R/C/U/D/A/E/M/Ad | Security / RBAC | Platform Users | Tenants (support) |
|------|---------------|-------------------------------|-----------------|----------------|-------------------|
| Platform Owner | Platform | F/—/F/—/—/F/F/**F** | F · manage · **admin** | F · manage · **admin** | F · manage |
| Platform Administrator | Platform | F/—/F/—/—/F/F/L | F · manage · — | F · manage · — | F · manage |
| Support Engineer | Platform | F/—/L/—/—/L/L/— | F · — · — (`security.audit`) | L · — · — | F · L |
| Customer Success | Platform | F/—/L/—/—/L/L/— | L · — · — | L · — · — | F · L |
| Sales | Platform | L/—/—/—/—/L/—/— | — | L · — · — | L · — |
| Finance | Platform | F/—/L/—/—/F/L/— | L · — · — | L · — · — | L · L (`subscription.*`) |
| Auditor | Platform | F/—/—/—/—/**F**/—/— | **F** · — · — (+ export) | F · — · — | F · — |

---

## 2. Organization / restaurant family × identity resources

| Role | Default scope | Organization | Tenant | Restaurant | Branch | Memberships |
|------|---------------|--------------|--------|------------|--------|-------------|
| Organization Owner | Organization | F···M/**Ad** | F···M/**Ad** | F···M/Ad | F···M/Ad | F···M/Ad |
| Organization Administrator | Organization | F···M/— | F···M/L | F···M/L | F···M/L | F···M/— |
| Restaurant Owner | Restaurant | — | L read if linked | F···M/**Ad** | F···M/**Ad** | F···M/L |
| Restaurant Administrator | Restaurant | — | — | F···M/— | F···M/L | F···M/— |
| Branch Manager | Branch | — | — | L read | F···M/— | L (branch staff) |
| Read Only (tenant) | Assigned | L | L | L | L | L |
| Guest (future) | Own/Public | — | — | L public | — | — |
| Partner (future) | Contract scope | L | L | L | L | — |

*(Cells abbreviated: where F appears under a resource, apply R/C/U/D/A/E/M/Ad per permission catalog for that resource; Ad only where marked.)*

### Expanded restaurant family × Restaurant resource

| Role | R | C | U | D | A | E | M | Ad |
|------|---|---|---|---|---|---|---|-----|
| Organization Owner | F | F | F | F | — | F | F | F |
| Organization Administrator | F | L | F | — | — | F | F | — |
| Restaurant Owner | F | F | F | F | F* | F | F | F |
| Restaurant Administrator | F | — | F | — | L | F | F | — |
| Branch Manager | F | — | L | — | L | L | L | — |
| Supervisor | F | — | — | — | L | L | — | — |
| Cashier | F | — | — | — | — | — | — | — |
| Kitchen | L | — | — | — | — | — | — | — |
| Waiter | F | — | — | — | — | — | — | — |
| Read Only | F | — | — | — | — | L | — | — |
| Guest | L | — | — | — | — | — | — | — |
| Partner | L | — | — | — | — | L | — | — |

\* Approvals at owner level for venue policy actions.

---

## 3. Venue operations × business resources

### 3.1 Menu

| Role | R | C | U | D | A | E | M | Ad |
|------|---|---|---|---|---|---|---|-----|
| Restaurant Owner | F | F | F | F | — | F | F | F |
| Restaurant Administrator | F | F | F | L | — | F | F | — |
| Branch Manager | F | L | L | — | — | — | L | — |
| Supervisor | F | — | — | — | — | — | — | — |
| Cashier / Kitchen / Waiter | F | — | — | — | — | — | — | — |
| Read Only | F | — | — | — | — | — | — | — |
| Platform Support roles | L | — | — | — | — | — | — | — |

### 3.2 Order

| Role | R | C | U | D | A | E | M | Ad |
|------|---|---|---|---|---|---|---|-----|
| Restaurant Owner | F | F | F | — | F | F | F | — |
| Restaurant Administrator | F | F | F | — | F | F | F | — |
| Branch Manager | F | F | F | — | F | L | F | — |
| Supervisor | F | F | F | — | F | — | F | — |
| Cashier | F | F | F | — | L | — | L | — |
| Kitchen | F | — | L† | — | — | — | L† | — |
| Waiter | F | F | F | — | — | — | L | — |
| Read Only | F | — | — | — | — | — | — | — |
| Guest | L‡ | L‡ | L‡ | — | — | — | — | — |

† Kitchen fulfilment fields only.  
‡ Own / public self-order path only.

### 3.3 Session / Floor

| Role | R | C | U | D | A | E | M | Ad |
|------|---|---|---|---|---|---|---|-----|
| Restaurant Owner / Admin | F | F | F | F | — | — | F | — |
| Branch Manager / Supervisor | F | F | F | L | — | — | F | — |
| Waiter | F | F | F | — | — | — | F | — |
| Cashier | F | L | L | — | — | — | L | — |
| Kitchen | L | — | — | — | — | — | — | — |
| Read Only | F | — | — | — | — | — | — | — |

### 3.4 Check / Payments / Refunds

| Role | R | C | U | D | A | E | M | Ad |
|------|---|---|---|---|---|---|---|-----|
| Restaurant Owner | F | — | F | — | F | F | F | — |
| Restaurant Administrator | F | — | F | — | F | F | F | — |
| Branch Manager | F | — | F | — | F | L | F | — |
| Supervisor | F | — | L | — | F | — | L | — |
| Cashier | F | — | L | — | — | — | F§ | — |
| Waiter / Kitchen | L | — | — | — | — | — | — | — |
| Read Only | F | — | — | — | — | L | — | — |
| Finance (platform) | L | — | — | — | — | F | L | L |

§ Payment/settlement execution — not refund approve unless separately granted.

**Refund-specific**

| Role | refunds.create | refunds.approve | refunds.manage |
|------|:--------------:|:---------------:|:--------------:|
| Restaurant Owner | F | F | F |
| Restaurant Administrator | F | F | F |
| Branch Manager | F | F | F |
| Supervisor | F | F | L |
| Cashier | L | — | L |
| Others | — | — | — |

---

## 4. Devices / Printers / Realtime

| Role | Devices R/M/Ad | Printers R/M | Realtime R/M |
|------|----------------|--------------|--------------|
| Platform Owner / Admin | F/F/F | F/F | F/F |
| Support Engineer | F/L/— | F/L | F/L |
| Restaurant Owner | F/F/F | F/F | F/F |
| Restaurant Administrator | F/F/L | F/F | F/F |
| Branch Manager | F/L/— | F/L | F/L |
| Supervisor / Cashier / Kitchen / Waiter | L/—/— | L/— | L¶/— |
| Read Only | L/—/— | L/— | — |
| Auditor | F/—/— | F/— | L/— |

¶ Channel subscribe only if duty/device session requires; human RBAC still gates mint.

---

## 5. Reporting / Analytics / Subscription / AI

| Role | reports.view | reports.export | analytics.view | analytics.export | subscription.read | subscription.manage | subscription.admin | ai.read | ai.invoke | ai.manage | ai.admin |
|------|:------------:|:--------------:|:--------------:|:----------------:|:-----------------:|:-------------------:|:------------------:|:-------:|:---------:|:---------:|:--------:|
| Platform Owner | F | F | F | F | F | F | **F** | F | F | F | **F** |
| Platform Administrator | F | F | F | F | F | L | L | F | F | L | — |
| Support / CS | F | L | F | L | F | — | — | L | — | — | — |
| Sales | L | L | L | — | L | — | — | — | — | — | — |
| Finance | F | F | F | F | F | F | L | — | — | — | — |
| Auditor | F | F | F | F | F | — | — | L | — | — | — |
| Organization Owner | F | F | F | F | F | F | — | F | F | L | — |
| Organization Administrator | F | F | F | L | F | L | — | F | F | — | — |
| Restaurant Owner | F | F | F | F | F | F | — | F | F | L | — |
| Restaurant Administrator | F | F | F | L | F | — | — | F | F | — | — |
| Branch Manager | F | L | F | — | — | — | — | L | L | — | — |
| Supervisor | F | — | L | — | — | — | — | L | L | — | — |
| Cashier / Kitchen / Waiter | L | — | — | — | — | — | — | — | — | — | — |
| Read Only | F | — | F | — | L | — | — | L | — | — | — |
| Guest | — | — | — | — | — | — | — | — | — | — | — |
| Partner | L | L | L | L | — | — | — | L | L | — | — |

---

## 6. Matrix reading rules

1. **F** still requires Subscription entitlement when the feature is commercially gated.  
2. **L** must be documented in assignment policy (threshold, Own Resource, or field-level).  
3. Platform family cells for tenant resources imply **support scope**, not ownership.  
4. Empty/— is deny; absence of a role row does not imply allow.  
5. Custom roles clone a subset of an existing row’s **F/L** cells — never exceed creator’s grantable set.  
6. **AP-15:** Permission column headers and resolved keys are immutable contracts; deprecate rather than rename/reuse.  
7. **AP-16:** Runtime domains must not branch on matrix role rows — only on authorize(permission) outcomes produced by RBAC.

---

## 7. Coverage checklist

| Resource class | Matrix section |
|----------------|----------------|
| Platform Operations / Security / Users / Tenants | §1 |
| Organization / Tenant / Restaurant / Branch / Memberships | §2 |
| Menu / Order / Session / Check / Refund | §3 |
| Device / Printer / Realtime | §4 |
| Reports / Analytics / Subscription / AI | §5 |
