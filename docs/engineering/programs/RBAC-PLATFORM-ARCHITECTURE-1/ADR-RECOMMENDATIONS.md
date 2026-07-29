# ADR Recommendations — Deliverable

**Program:** RBAC-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only — ADRs **recommended**, not published by this program  
**Date:** 2026-07-29  
**Revision:** AP-15 · AP-16 incorporated — **do not publish ADR-ARCH-034 until Architecture Authority re-acceptance**

Next free constitutional number after ADR-ARCH-033: **ADR-ARCH-034**.

---

## 1. Recommended primary ADR

### ADR-ARCH-034 — RBAC Platform Architecture (Enterprise Authorization)

| Field | Proposed value |
|-------|----------------|
| **Status** | Draft → Proposed (upon Architecture Authority **re-acceptance** of this program after AP-15/AP-16 revision) |
| **Owner** | Architecture Authority |
| **Program** | RBAC-PLATFORM-ARCHITECTURE-1 |
| **Supersedes** | — (extends AR-1 commercial-audit authority layers; does not supersede financial ADRs) |

#### Context

MineuQR’s authorization is binary (`user` \| `admin`) plus restaurant ownership. Upcoming Tenant Identity, Subscription, and AI Operations platforms require a unified, resource-scoped, permission-based model without conflating AuthN, ownership, entitlement, and access.

#### Decision (proposed)

1. Establish **RBAC Platform** as SSOT for roles, permission catalog, authorization rules, Role→Permission mapping, role inheritance, and assignment policies.  
2. Mandate **permission-based**, **resource-based**, **scope-bounded**, **server-authoritative** authorization.  
3. Enforce **hard boundary** between Platform family roles and Tenant/Org family roles.  
4. Keep **Tenant Identity** as ownership/membership SSOT; **Subscription** as entitlement SSOT; **RBAC** as access SSOT.  
5. Require AI and service accounts to inherit caller / explicit grants with **no elevation**.  
6. Forbid new hardcoded role checks in domain logic after adoption programs begin.  
7. **Mandate AP-15 — Permission Stability** as a governing principle of the RBAC constitution.  
8. **Mandate AP-16 — Domain Independence** as a governing principle of the RBAC constitution.

#### Mandatory governing principles (must appear in ADR-ARCH-034)

When published, ADR-ARCH-034 **shall** adopt the full principle set **AP-01…AP-16**, with explicit normative text for:

| ID | Title | Mandatory statement (summary) |
|----|-------|-------------------------------|
| **AP-15** | Permission Stability | Permission identifiers are immutable public contracts. Keys may be deprecated. Keys must never be silently renamed. Keys must never be reused for different semantics. Obsolete permissions are marked deprecated, not reassigned. |
| **AP-16** | Domain Independence | Business Domains never evaluate Roles; they evaluate Permissions only. Role→Permission mapping, role definitions, role inheritance, and authorization mapping belong exclusively to the RBAC Platform. No business module may contain role-specific authorization logic. |

AP-07, AP-08, and AP-09 remain in force and are subsumed/clarified by AP-16 for domain call sites.

#### Consequences

| + | − |
|---|---|
| Enterprise multi-role staff model becomes possible | Migration from binary guards is multi-program |
| Clear governance for platform vs tenant | Temporary dual-read complexity |
| Compatible with AI / Subscription / Identity | Catalog discipline required across domains |
| Stable permission contracts for APIs, tokens, AI tools (**AP-15**) | Deprecation discipline instead of casual renames |
| Domains stay free of role branching (**AP-16**) | Legacy `role ===` call sites need deliberate migration |

#### Related

- AR-1 Super Admin hard boundary (`docs/commercial-audit/ADMIN-DASHBOARD-REMEDIATION-AR-1.md`)  
- ADR-ARCH-003 Service Ownership Boundaries  
- ADR-ARCH-006 UI as Presentation Only  
- Program principles: [GOVERNANCE-AND-PRINCIPLES.md](./GOVERNANCE-AND-PRINCIPLES.md) (**AP-15**, **AP-16**)

**This program does not create the ADR file or update the Registry.**  
**Do not publish ADR-ARCH-034 until this revision is Architecture Authority accepted.**

---

## 2. Supporting ADR candidates (later)

| ID (suggested) | Title | When |
|----------------|-------|------|
| ADR-ARCH-035 | Tenant Identity Platform — Ownership & Membership | When Tenant Identity architecture starts |
| ADR-ARCH-036 | Authorization Decision API & Guard Migration | When first RBAC foundation implementation ships |
| ADR-ARCH-037 | Service Accounts, API Tokens & Delegation | When machine principals are introduced |
| ADR-ARCH-038 | Subscription–RBAC Entitlement Intersection | When Subscription Platform architecture starts |

Numbers are **placeholders** — assign at publication time per Registry gaps (015/029 unused).

Supporting ADRs must preserve **AP-15** (token/API scopes bind to stable permission keys) and **AP-16** (domains authorize by permission only).

---

## 3. ADR publication checklist (future)

- [ ] Architecture Authority **re-accepts** RBAC-PLATFORM-ARCHITECTURE-1 (including AP-15 · AP-16)  
- [ ] Draft ADR-ARCH-034 from template with **AP-01…AP-16** mandatory  
- [ ] Explicit ADR sections for Permission Stability and Domain Independence  
- [ ] Register in `docs/architecture/constitution/ADR-Registry.md`  
- [ ] Link this program package as evidence  
- [ ] Do **not** implement runtime until a dedicated Foundation program is certified  

---

## 4. Explicit non-ADRs

This program does **not** recommend ADRs for:

- Authentication redesign  
- JWT/session changes  
- Billing/subscription SKU design  
- Device capability roles (remain Device / Realtime planes)  
- Financial aggregate ownership (020–033 unchanged)
