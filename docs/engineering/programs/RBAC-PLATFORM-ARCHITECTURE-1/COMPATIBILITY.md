# Compatibility — AI · Subscription · Tenant Identity

**Program:** RBAC-PLATFORM-ARCHITECTURE-1  
**Deliverables:** 10 · 11 · 12  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. AI compatibility (Deliverable 10)

### 1.1 Laws

| Rule ID | Statement |
|---------|-----------|
| **AI-01** | AI **never** bypasses authorization. |
| **AI-02** | AI **inherits** the caller’s effective permissions (and scope). |
| **AI-03** | AI **cannot elevate** privilege — no hidden superuser tool channel. |
| **AI-04** | Authorization remains **server-side**; model output is not an authority. |
| **AI-05** | Tool/function calls in AI Operations must each pass `authorize` for the underlying permission. |
| **AI-06** | Service accounts used by AI batch jobs are first-class principals with explicit grants — still no ambient admin. |
| **AI-07** | AI tools bind to **stable permission keys** (**AP-15**); they must not invent, alias, or silently rename permissions. |
| **AI-08** | AI orchestration must not branch on role names; capability gates are permission checks only (**AP-16**). |

### 1.2 Consumption pattern

```
Caller (human / token)
   │ effective permission set P @ scope S
   ▼
AI Operations Platform (orchestrates)
   │ for each tool invocation
   ▼
RBAC authorize(caller|delegated SA, permission, resource, scope)
   │ allow only
   ▼
Domain command / read
```

### 1.3 Forbidden AI patterns

- “System prompt says you are admin”  
- Using Platform Owner service key for all tenants  
- Client-side-only gating of AI actions  
- Storing elevated tokens inside model context as authority  
- Tool manifests that rename or invent permission keys (**AP-15**)  
- `if (caller.role === …)` inside AI tool routers (**AP-16**)  

### 1.4 Permissions AI uses

From catalog: `ai.read`, `ai.invoke`, `ai.manage`, `ai.admin` — plus **whatever underlying resource permissions** the tool requires (e.g. `orders.read`).

Those keys are immutable contracts (**AP-15**). Role expansion for the caller remains inside RBAC (**AP-16**).

---

## 2. Subscription compatibility (Deliverable 11)

### 2.1 Separation law

| Plane | Determines |
|-------|------------|
| **Subscription** | **What features are available** to a Tenant/Restaurant (entitlement) |
| **RBAC** | **Who may use** available features (authorization) |

```
ALLOW action ⇔ entitled(feature) AND authorized(permission, scope)
```

Either false ⇒ deny (product may choose messaging: upgrade vs forbidden).

### 2.2 Independence rules

| Rule ID | Statement |
|---------|-----------|
| **SUB-01** | Subscription state must not grant roles. |
| **SUB-02** | Roles must not invent feature entitlement. |
| **SUB-03** | `plan: ADMIN` commercial bypass (legacy) must not be confused with Platform Owner RBAC. |
| **SUB-04** | `subscription.manage` is an RBAC permission to operate subscription **tools**; it does not create plan SKUs. |
| **SUB-05** | Feature permissions (future) are catalog entries gated by both planes — still not role-specific. |

### 2.3 Example

| Actor | Entitled reports.export? | Has reports.export? | Result |
|-------|--------------------------|---------------------|--------|
| Restaurant Owner on Starter | No | Yes | Deny (upgrade) |
| Cashier on Enterprise | Yes | No | Deny (forbidden) |
| Restaurant Admin on Enterprise | Yes | Yes | Allow |

---

## 3. Tenant Identity compatibility (Deliverable 12)

### 3.1 Separation law

| Plane | Determines |
|-------|------------|
| **Tenant Identity** | **Who owns** resources; org/tenant/restaurant/branch graph; memberships |
| **RBAC** | **Who may access** resources given membership + roles + permissions |

### 3.2 No ownership duplication

| Fact | Stored once in | RBAC usage |
|------|----------------|------------|
| `restaurant.ownerUserId` | Tenant Identity | Seed Restaurant Owner role; resolve scope |
| Org→Tenant→Restaurant links | Tenant Identity | Scope hierarchy walk |
| Membership rows | Tenant Identity (binding) | Input to effective roles |
| Role & permission definitions | **RBAC only** | — |
| “Virtual ownership” inside RBAC | **Forbidden** | — |

### 3.3 Interaction rules

| Rule ID | Statement |
|---------|-----------|
| **TI-01** | RBAC never creates a second ownership graph. |
| **TI-02** | Ownership changes emit identity events; RBAC assignment policies may react (e.g. re-seed Owner role). |
| **TI-03** | Losing ownership removes Owner role seed; explicit other memberships may remain if still valid. |
| **TI-04** | Platform support access is RBAC grant, not Identity ownership transfer. |
| **TI-05** | Until Tenant Identity ships, architecture treats `restaurants.userId` as the interim ownership SSOT. |

---

## 4. Combined decision stack

```
1. Authenticate          → principalId          (Auth)
2. Resolve identity      → memberships, ownership (Tenant Identity)
3. Entitlement check     → feature available?   (Subscription)
4. Authorize             → permission@scope?    (RBAC)
5. Execute domain logic  → business invariants  (Domain)
```

Steps 3 and 4 are independently deny-capable.  
Step 5 never re-checks role names.
