# Compatibility — Subscription · RBAC · AI

**Program:** TENANT-IDENTITY-PLATFORM-ARCHITECTURE-1  
**Deliverables:** 9 · 10 · 11  
**Status:** Architecture only  
**Date:** 2026-07-29  
**Revision:** RI-01 · RI-02 · RI-03 · ON-LAW

---

## 1. Subscription compatibility (Deliverable 9)

### Separation law

| Plane | Defines |
|-------|---------|
| **Tenant Identity** | **Who the customer is** (Organization / Tenant / Restaurant identity & lineage) |
| **Subscription** | **What the customer owns commercially** (plans, entitlements, seats) |

**Neither owns the other.**

### Rules

| Rule ID | Statement |
|---------|-----------|
| **SUB-TI-01** | Subscription attaches to a **Canonical** Identity node (prefer **Tenant**; interim Restaurant allowed). |
| **SUB-TI-02** | Creating a subscription never mints hierarchy identity (Identity first — TIP-09). |
| **SUB-TI-03** | Identity lifecycle may block entitlement use (Suspended Tenant ⇒ features unusable) without Subscription owning identity. |
| **SUB-TI-04** | Plan changes never change canonical IDs, lineage, or operational numbers. |
| **SUB-TI-05** | Payer account ≠ hierarchy parent — link explicitly; never reparent via billing (**RI-01**). |
| **SUB-TI-06** | Subscription must not resolve customers by name/email/ops number as identity authority (**RI-03**). |

---

## 2. RBAC compatibility (Deliverable 10)

### Separation law

| Plane | Defines |
|-------|---------|
| **Tenant Identity** | Resource **ownership**, **lineage**, membership bindings, Canonical IDs |
| **RBAC** | **Access** to those resources (permissions @ scopes) |

### Rules

| Rule ID | Statement |
|---------|-----------|
| **RBAC-TI-01** | Ownership **never** grants permission by itself. |
| **RBAC-TI-02** | Permission **never** changes ownership or lineage. |
| **RBAC-TI-03** | RBAC scopes use Tenant Identity **canonical** IDs — never operational numbers (**ON-LAW**). |
| **RBAC-TI-04** | Membership rows owned by Identity; role assignments on membership owned by RBAC policy. |
| **RBAC-TI-05** | Accountable-owner transfer emits Identity events; RBAC may re-seed Owner role — lineage unchanged (**RI-01**). |
| **RBAC-TI-06** | Support cross-tenant access is RBAC grant, not Identity reparenting. |
| **RBAC-TI-07** | Domains evaluate **permissions only** (RBAC AP-16); they consume Canonical IDs as resource homes (**RI-03**). |

---

## 3. AI compatibility (Deliverable 11)

| Rule ID | Statement |
|---------|-----------|
| **AI-TI-01** | AI **consumes** canonical identities only. |
| **AI-TI-02** | AI **never creates** Organization/Tenant/Restaurant/Branch identity. |
| **AI-TI-03** | AI **never modifies** identity, lineage, ownership, or lifecycle. |
| **AI-TI-04** | AI **always respects** Tenant boundaries (caller’s effective scope). |
| **AI-TI-05** | AI must not key memory/tools on mutable names or operational numbers as identity (**RI-02**, **ON-LAW**). |
| **AI-TI-06** | AI must not implement independent identity lookup (name/slug/email/phone/ops#) (**RI-03**). |
| **AI-TI-07** | Identity minting/resolution remains Tenant Identity Platform only. |

### Domain implications (RI-03)

Orders · Sessions · Checks · Reporting · Realtime · Devices · External integrations — receive Canonical IDs; never resolve identity independently.

---

## 4. Combined stack

```
1. Authenticate                                      (Auth)
2. Resolve identity / lineage (TIP only)             (Tenant Identity · RI-03)
3. Entitlement                                       (Subscription)
4. Authorize permission @ canonical scope            (RBAC)
5. Domain business logic                             (Domains)
```
