# Architecture Overview — Tenant Identity Platform

**Program:** TENANT-IDENTITY-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only — READY FOR ARCHITECTURE AUTHORITY FINAL REVIEW  
**Date:** 2026-07-29  
**Revision:** RI-01 · RI-02 · RI-03 · ON-LAW

---

## 1. Purpose

The **Tenant Identity Platform** answers:

> What is the stable operational identity of this customer entity, who owns it in the hierarchy, and how must every other platform reference it?

It does **not** answer:

| Question | Owner |
|----------|-------|
| Who may access this resource? | RBAC Platform |
| Is the caller authenticated? | Authentication |
| What features are entitled? | Subscription Platform |
| What is the restaurant’s menu/orders? | Business domains |

---

## 2. Current state (baseline — unchanged)

| Fact | Today |
|------|-------|
| De facto tenant | `restaurants` row |
| Ownership | `restaurants.userId` |
| Organization / Tenant / Branch entities | Not modeled (branchId column only on devices) |
| Identity keys | Mutable names, emails, numeric DB ids used operationally |
| Stable public contract IDs | Not established as platform law |

This program does **not** change runtime. It defines the **target** identity platform.

---

## 3. Target architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Tenant Identity Platform                      │
│  Hierarchy · Canonical IDs · Operational Numbers · Lifecycle │
│  Ownership · Membership bindings · Reference contracts       │
└───────────────┬─────────────────┬───────────────────────────┘
                │ owns / identifies│
    ┌───────────▼──────┐  ┌───────▼────────┐  ┌──────────────▼─────────┐
    │ RBAC Platform    │  │ Subscription   │  │ Business / Ops / AI    │
    │ scopes + member  │  │ attaches plans │  │ reference IDs only     │
    │ seed from owner  │  │ to Tenant/…    │  │ never invent identity  │
    └──────────────────┘  └────────────────┘  └────────────────────────┘
```

**Package (future implementation — not created here):** e.g. `shared/tenant-identity-platform/`

---

## 4. Core law

```
Identity ≠ Name ≠ Email ≠ Domain ≠ Phone ≠ Owner display ≠ Database surrogate
Identity = permanent platform contract identifier (+ optional operational number)
```

Mutable business attributes may change freely. **Identity does not.**

---

## 5. Entity set (canonical)

| Entity | Role in platform |
|--------|------------------|
| **Platform** | MineuQR operator root (not a customer record) |
| **Organization** | Legal / commercial customer grouping |
| **Tenant** | Primary isolation & commercial attachment unit |
| **Restaurant** | Operating venue |
| **Branch** | Optional sub-venue under a Restaurant |
| **Platform User** | Human/machine account principal (referenced; Auth owns credentials) |
| **Membership** | Binding of User ↔ Org/Tenant/Restaurant/Branch (Identity owns binding; RBAC owns roles on it) |

Device principals remain a **parallel plane** (Device Management) — they *bind to* Restaurant/Branch identities; they are not tenant hierarchy nodes.

---

## 6. Plane separation

| Plane | Owns | Must not own |
|-------|------|--------------|
| **Tenant Identity** | Who / owns what / hierarchy / IDs / numbers / lifecycle | Permissions, entitlements, AuthN |
| **RBAC** | Who may access | Ownership graph |
| **Subscription** | What is entitled / purchased | Identity or access |
| **Auth** | Sessions / credentials | Tenancy graph |
| **Domains** | Business facts keyed by **Canonical Identity** | Identity minting; identity resolution (**RI-03**) |

---

## 7. Design laws (summary)

1. Immutable Identity  
2. Identity is not business data  
3. Never recycle IDs  
4. Identity survives rename; accountable-owner transfer never mutates lineage (**RI-01**)  
5. No semantic encoding in IDs  
6. Platform-wide uniqueness  
7. Stable operational numbers — **not** identity (**ON-LAW**)  
8. Identity before business data  
9. Ownership clarity — never ambiguous  
10. Compatible with RBAC / Subscription / AI without redesign  
11. **Identity Lineage (RI-01)** — permanent parent; no reassignment; migration ≠ reparent  
12. **External Reference Stability (RI-02)** — external refs bound to Canonical Identity  
13. **Identity Resolution Authority (RI-03)** — TIP sole resolver; domains consume Canonical IDs only  

Full set: [GOVERNANCE-PRINCIPLES.md](./GOVERNANCE-PRINCIPLES.md).
