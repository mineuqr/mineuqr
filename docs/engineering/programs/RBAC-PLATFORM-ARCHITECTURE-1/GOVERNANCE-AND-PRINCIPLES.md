# Governance Rules & Architecture Principles — Deliverables 7–8

**Program:** RBAC-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Architecture principles

| ID | Principle | Normative statement |
|----|-----------|---------------------|
| **AP-01** | Least Privilege | Grant the minimum permission set and narrowest scope required for the duty. |
| **AP-02** | Explicit Allow | Access requires an explicit grant matching permission + resource + scope. |
| **AP-03** | Default Deny | If no grant matches, deny. Failures / unknowns deny. |
| **AP-04** | Immutable Platform Ownership | Platform Owner protections cannot be removed via ordinary admin UI or self-service. |
| **AP-05** | No UI Authorization | UI may hide controls for UX; **server** is the only authority (aligns ADR-ARCH-006). |
| **AP-06** | Server Authoritative | All mutations and sensitive reads enforce RBAC on the server. |
| **AP-07** | Permission-Based | Call sites check permissions, never role name literals. |
| **AP-08** | Role-Independent Business Logic | Domains encode business rules; authorization entry is permission-gated via RBAC — domains never evaluate roles. |
| **AP-09** | No Hardcoded Role Checks | `if (role === 'admin')` is forbidden in new code after adoption; migrate legacy deliberately. |
| **AP-10** | Resource-Based | Every permission targets a registered resource type. |
| **AP-11** | Scope-Bounded | Every grant carries an explicit scope; no ambient global tenant power. |
| **AP-12** | Auditable | Allow/deny decisions emit audit metadata (principal, permission, resource, scope, outcome). |
| **AP-13** | Separation of Planes | AuthN ≠ Identity ≠ RBAC ≠ Subscription ≠ Domain logic. |
| **AP-14** | Extensible Without Redesign | Custom roles, tokens, partners, delegation fit the same model. |
| **AP-15** | Permission Stability | Permission identifiers are immutable public contracts; deprecate — never silently rename or reuse. |
| **AP-16** | Domain Independence | Business Domains evaluate Permissions only; Role→Permission mapping is exclusive to the RBAC Platform. |

### 1.1 AP-15 — Permission Stability (constitutional detail)

**Definition:** Permission identifiers are **immutable public contracts**.

| Rule | Statement |
|------|-----------|
| Immutable contract | Permission keys are part of the platform contract and must remain stable across releases. |
| Deprecation allowed | Obsolete permissions **must** be marked `deprecated` (with successor pointer when applicable). |
| No silent rename | Permission keys must **never** be silently renamed. |
| No semantic reuse | A retired key must **never** be reassigned to different semantics. |
| Historical validity | Deprecated keys remain valid for historical grants, audits, and dual-read migration until an explicit retirement program removes them. |
| Replacement | New semantics require a **new** permission key; consumers migrate deliberately. |

**Implications**

| Surface | Implication |
|---------|-------------|
| Permission Catalog | Keys are append-mostly; status ∈ {`active`, `deprecated`, `retired`}; renames are not a catalog operation |
| Authorization Matrix | Matrix cells reference stable permission keys; deprecation updates notes — not silent key swaps |
| Future compatibility | Custom roles, tokens, and partners bind to stable keys without forced rewrite on every release |
| API compatibility | External/API token scopes and future authorize APIs treat keys as long-lived contracts |
| AI compatibility | AI tool declarations bind to stable permission keys; models must not invent or alias keys |

### 1.2 AP-16 — Domain Independence (constitutional detail)

**Definition:** Business Domains **never** evaluate Roles. Business Domains evaluate **Permissions only**.

| Rule | Statement |
|------|-----------|
| Permission evaluation only | Domains call `authorize(permission, resource, scope)` (or equivalent guard). |
| Exclusive mapping owner | Role definitions, Role→Permission mapping, role inheritance, and authorization matrix mapping belong **exclusively** to the RBAC Platform. |
| No role-specific domain logic | No business module may contain role-specific authorization logic. |

**Prohibited patterns (normative)**

```
if (user.role === "...")
switch (user.role) { ... }
role-based business branching for authorization or capability
```

**Approved pattern**

```
authorize({ principalId, permission, resourceType, resourceId?, scope })
→ allow | deny
// then execute domain business rules (invariants), never role switches
```

**Relationship to AP-07 / AP-08 / AP-09:** AP-16 is the permanent constitutional restatement. AP-07–AP-09 remain; they do not authorize any domain role evaluation.

---

## 2. Platform governance — ownership

### 2.1 RBAC Platform owns

| Artifact | Notes |
|----------|-------|
| Role definitions (canonical catalog) | Including future custom-role schema · **AP-16** |
| Role → Permission mapping | Exclusive SSOT · **AP-16** |
| Role inheritance | Exclusive SSOT · **AP-16** |
| Permission catalog | Versioned SSOT · immutable keys · **AP-15** |
| Authorization rules / decision semantics | Including scope hierarchy evaluation |
| Assignment policies | Who may assign which roles at which scopes |
| Authorization matrix (canonical) | Updated via Architecture programs · stable permission references · **AP-15** |
| Deny / suspension semantics | Effective access computation |
| RBAC audit event schema | Decision + assignment changes |

### 2.2 RBAC Platform does **not** own

| Artifact | Owner |
|----------|-------|
| User / Org / Tenant / Restaurant / Branch records | Tenant Identity Platform |
| Ownership links | Tenant Identity Platform |
| Authentication / sessions / passwords / OAuth | Auth |
| Subscription plans / entitlements | Subscription Platform |
| Order / Check / Menu / Device business logic | Domain platforms |
| AI model behavior | AI Operations Platform |
| UI layout / navigation | Presentation |

### 2.3 Business domains remain owners of business logic

Domains (**AP-16**):

1. Validate business invariants.  
2. Call RBAC `authorize` (or guard) with a **permission** before side effects.  
3. Never evaluate roles; never re-implement role matrices locally.  
4. Never treat subscription entitlement as authorization (or vice versa).

---

## 3. Assignment policies (governance rules)

| Rule ID | Statement |
|---------|-----------|
| **AG-01** | Only Platform Owner may grant Platform Owner. |
| **AG-02** | Platform Administrator may grant Support/CS/Sales/Finance/Auditor within policy; may not grant Platform Owner. |
| **AG-03** | Organization Owner may grant Organization Administrator and seed Restaurant Owner within org. |
| **AG-04** | Restaurant Owner may grant Restaurant Administrator and venue ops roles within owned restaurants. |
| **AG-05** | No principal may grant a role whose permission set is not ⊆ granter’s grantable set at that scope. |
| **AG-06** | Platform ↔ Tenant boundary: tenant roles never grant platform permissions. |
| **AG-07** | Break-glass cross-tenant access requires Platform family role + audited ticket/reason (future policy). |
| **AG-08** | Role assignment changes are append-only audited facts. |
| **AG-09** | Temporary access must set `validTo`; expired grants are denials. |
| **AG-10** | Delegation chains are bounded depth and time; revoking source revokes derived grants. |

---

## 4. Hard boundary (from AR-1 — retained & extended)

```
════════════════════════ PLATFORM ════════════════════════
 Platform Owner / Platform Administrator / Support / …
══════════════════════════════════════════════════════════
                         ║  HARD BOUNDARY
════════════════════════ TENANT ══════════════════════════
 Organization / Restaurant Owner / Staff / Guest / Partner
══════════════════════════════════════════════════════════
```

Platform authority is **never** inferred from:

- Restaurant ownership  
- Subscription rows  
- Restaurant count  
- Commercial entitlements / `plan: ADMIN`  
- UI route names  

---

## 5. Compliance with non-functional requirements

| NFR | How architecture satisfies |
|-----|----------------------------|
| Enterprise-ready | Role families, audit, least privilege, immutable owner |
| Multi-tenant | Scope hierarchy + Tenant Identity ownership |
| International | Permission keys stable (**AP-15**); UI labels localized outside RBAC |
| Scalable | Decision = membership + role perms + scope cover (cacheable) |
| Auditable | AP-12 + assignment audit |
| Extensible | Custom roles, groups, tokens, partners (**AP-14**) |
| Zero business logic duplication | Domains call shared authorize; never roles (**AP-16**) |
| No ownership violations | Identity owns ownership; RBAC owns access + Role→Permission map |
| Contract stability | Permission identifiers immutable across releases (**AP-15**) |
