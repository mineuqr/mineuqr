# Architecture Overview — RBAC Platform

**Program:** RBAC-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only — READY FOR ARCHITECTURE AUTHORITY REVIEW  
**Date:** 2026-07-29

---

## 1. Purpose

The **RBAC Platform** is MineuQR’s canonical authorization plane. It answers one question only:

> Given a **principal**, a **permission**, a **resource**, and a **scope** — is the action **allowed**?

It does **not** answer who the principal is (Identity), whether a feature is commercially available (Subscription), or how the principal authenticated (Authentication).

---

## 2. Current state (baseline — unchanged by this program)

| Fact | Today |
|------|-------|
| Dashboard roles | Binary: `users.role ∈ { user, admin }` |
| Tenant boundary | `restaurants.userId` ownership **or** admin bypass |
| Guards | `assertRestaurantAccess` · `assertAdminAccess` · tRPC procedure ladder |
| Staff membership | Not modeled |
| Organization / Branch entities | Not modeled (branchId column only on devices) |
| Permission catalog | None |
| Fine-grained RBAC | None |

This program **does not change** any of the above at runtime. It defines the **target architecture** future programs will adopt.

---

## 3. Target architecture (conceptual)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Authentication (OUT OF SCOPE)                │
│              Session / JWT / OAuth → authenticated principal     │
└───────────────────────────────┬─────────────────────────────────┘
                                │ principal id
┌───────────────────────────────▼─────────────────────────────────┐
│                 Tenant Identity Platform (future)                │
│   Platform User · Organization · Tenant · Restaurant · Branch    │
│   Membership · Ownership hierarchy                               │
└───────────────────────────────┬─────────────────────────────────┘
                                │ who / owns what
┌───────────────────────────────▼─────────────────────────────────┐
│                      RBAC PLATFORM (this)                        │
│  Roles · Permissions · Resources · Scopes · Assignment Policies  │
│  Authorization Decision Engine (server-authoritative)            │
└───────────┬─────────────────────┬───────────────────┬───────────┘
            │                     │                   │
   ┌────────▼────────┐  ┌─────────▼─────────┐  ┌──────▼──────────┐
   │ Subscription    │  │ Business Domains  │  │ AI Operations   │
   │ Platform        │  │ (Order, Check, …) │  │ Platform        │
   │ Feature gate    │  │ Permission check  │  │ Inherit caller  │
   └─────────────────┘  └───────────────────┘  └─────────────────┘
```

---

## 4. Authorization decision formula

```
ALLOW ⇔
  principal is authenticated
  AND membership exists in target scope
  AND role assignment grants permission P
  AND permission P applies to resource type R
  AND requested scope S ⊆ assigned scope
  AND (if feature-gated) subscription entitles feature F
  AND no explicit deny / suspension applies
```

**Default:** DENY.  
**UI:** never authoritative.  
**AI / service accounts:** same formula; no elevation.

---

## 5. Plane separation (constitutional)

| Plane | Owner | Answers |
|-------|-------|---------|
| **Authentication** | Auth (out of scope) | Is the caller authenticated? |
| **Identity / Ownership** | Tenant Identity Platform | Who is the principal? Who owns the resource? |
| **Authorization (RBAC)** | **RBAC Platform** | May this principal perform P on R in S? |
| **Entitlement** | Subscription Platform | Is feature F available for this tenant? |
| **Business logic** | Domain owners | What happens if allowed? |

**Law:** No plane may implement another plane’s concerns.

---

## 6. Package / ownership (future implementation — not created here)

| Concern | Future home (proposed) |
|---------|------------------------|
| Permission catalog (immutable keys · **AP-15**) | RBAC Platform package (e.g. `shared/rbac-platform/`) |
| Role definitions | RBAC Platform |
| Role → Permission mapping · inheritance (**AP-16**) | RBAC Platform |
| Assignment policies | RBAC Platform |
| Decision API | Server RBAC service (authoritative) |
| Membership / ownership tables | Tenant Identity Platform |
| Feature flags / plan gates | Subscription Platform |
| Domain authorize call sites | Business domains — **permissions only** (**AP-16**) |

---

## 7. Parallel identity planes (must not conflate)

| Plane | Principals | Auth today | RBAC relationship |
|-------|------------|------------|-------------------|
| **Human dashboard users** | Platform User | Session | Primary RBAC subject |
| **Operational devices** | Device + device role | Device credentials | Separate capability model; may map to resource permissions later — **not** human roles |
| **Public / guest** | Tracking token / guest | Opaque tickets | Minimal public permissions; Guest role reserved |
| **Service accounts / API tokens** | Machine principal | Future | First-class principals under RBAC |
| **AI agents** | Acting as caller | Future | Inherit caller effective permissions |

Device roles (`kitchen_display`, `expo_display`, …) remain **device capability roles**, not human RBAC roles.

---

## 8. Design laws (summary)

1. Permission-based — never hardcode role names in business logic (**AP-07**, **AP-16**).  
2. Resource-based — every permission targets a resource type.  
3. Scope-bounded — every grant carries an explicit scope.  
4. Explicit allow / default deny.  
5. Least privilege.  
6. Server authoritative; UI decorative.  
7. Immutable Platform Ownership protections.  
8. Subscription and RBAC remain independent.  
9. Ownership stays in Tenant Identity — RBAC never duplicates ownership.  
10. Extensible without redesign (custom roles, delegation, partners, tokens).  
11. **Permission Stability (AP-15)** — permission keys are immutable public contracts; deprecate — never silently rename or reuse.  
12. **Domain Independence (AP-16)** — domains evaluate permissions only; RBAC exclusively owns Role→Permission mapping, role definitions, and inheritance.

Full principles: [GOVERNANCE-AND-PRINCIPLES.md](./GOVERNANCE-AND-PRINCIPLES.md).
