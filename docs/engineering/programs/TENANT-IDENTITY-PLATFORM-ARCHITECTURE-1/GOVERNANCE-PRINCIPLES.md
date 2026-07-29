# Governance Principles — Deliverable 7

**Program:** TENANT-IDENTITY-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29  
**Revision:** RI-01 · RI-02 · RI-03 · Operational Numbers Are Not Identity

---

## 1. Architecture principles (Tenant Identity Constitution)

| ID | Principle | Normative statement |
|----|-----------|---------------------|
| **TIP-01** | Immutable Identity | Canonical identifiers never change after issuance. |
| **TIP-02** | Single Source of Truth | Tenant Identity is the only owner of the Org→Tenant→Restaurant→Branch graph and their IDs. |
| **TIP-03** | No Identity Reuse | IDs and operational numbers are never recycled or reassigned. |
| **TIP-04** | Identity Independence | Identity does not depend on mutable business data (name, email, domain, phone, owner display). |
| **TIP-05** | Ownership Clarity | Every node has exactly one hierarchical owner; ambiguity is forbidden. |
| **TIP-06** | No Semantic IDs | IDs must not encode plan, region, status, role, or business meaning. |
| **TIP-07** | Platform-wide Uniqueness | Canonical IDs are unique across the platform (multi-region ready). |
| **TIP-08** | Stable Operational Numbers | Operational numbers are stable, readable, and independent of DB surrogates. |
| **TIP-09** | Identity before Business Data | Mint identity before attaching menus, orders, devices, or subscriptions. |
| **TIP-10** | Identity Survives Rename | Renaming never issues a new identity. |
| **TIP-11** | Accountable Owner Transfer | Designated user/accountable-party transfer never changes canonical IDs or hierarchy lineage (**RI-01**). |
| **TIP-12** | No Mutable Keys as Contract | Slugs, emails, and names are aliases/data — not contracts. |
| **TIP-13** | Auditability | Issuance, lifecycle, accountable-owner changes, and migrations are audited. |
| **TIP-14** | Plane Separation | Identity ≠ AuthN ≠ RBAC ≠ Subscription ≠ Domain logic. |
| **TIP-15** | Extensible Hierarchy | Franchises, holdings, resellers, partners fit without redesign. |
| **RI-01** | Identity Lineage | Hierarchy parent is permanent; never reassign parent; relocation only via controlled migration. |
| **RI-02** | External Reference Stability | External refs resolve through Canonical Identity; business-data changes never invalidate them. |
| **RI-03** | Identity Resolution Authority | Tenant Identity is the sole identity-resolution authority; domains never implement lookup rules. |
| **ON-LAW** | Operational Numbers Are Not Identity | Operational numbers are human/ops labels only — never authoritative identity. |

---

## 2. RI-01 — Identity Lineage (constitutional detail)

**Definition:** Identity lineage is **immutable**.

Every canonical identity has exactly one **permanent** parent within:

```
Platform → Organization → Tenant → Restaurant → Branch
```

| Rule | Statement |
|------|-----------|
| Permanent parent | Parent-child relationships are architectural contracts. |
| No reassignment | Canonical identities must **never** be reassigned to a different parent. |
| No casual relocation | Identity relocation is prohibited outside **explicit platform-approved migration procedures**. |
| Owner ≠ lineage | Accountable/beneficial ownership transfer must **never** mutate identity lineage. |
| Restructuring | Organizational restructuring uses controlled migration (**new IDs** under new parents + archive old) — **not** parent mutation on an existing ID. |

**Implications**

| Surface | Implication |
|---------|-------------|
| Identity hierarchy | Containment link is fixed at mint for the life of the ID |
| Ownership model | “Transfer” of designated user ≠ reparenting; reparenting is migration-only |
| Lifecycle | Archive/create-new preferred over mutate-parent |
| Enterprise restructuring | Franchise/holding moves are migration programs, not ID rewrites |

---

## 3. RI-02 — External Reference Stability (constitutional detail)

**Definition:** All externally exposed references resolve through **Canonical Identity**.

External references must remain stable regardless of changes to business attributes.

**External references include:** Public URLs · QR Codes · API identifiers · Webhook payloads · Integration identifiers · Customer-facing references.

| Mutable attribute | Must not invalidate external refs |
|-------------------|-----------------------------------|
| Restaurant / Branch name | ✓ |
| Owner | ✓ |
| Email / Phone | ✓ |
| Domain / Brand | ✓ |

**Law:** External references are permanently bound to Canonical Identity — **never** to mutable business data.

**Implications:** Public APIs · QR Platform · Integrations · Support · Future Marketplace — all key off canonical IDs (or tokens that resolve only via Tenant Identity to canonical IDs).

---

## 4. RI-03 — Identity Resolution Authority (constitutional detail)

**Definition:** The Tenant Identity Platform is the **sole authority** responsible for identity resolution.

| Rule | Statement |
|------|-----------|
| Domains consume | Business Domains consume **resolved Canonical Identities** only. |
| No domain lookup rules | Domains must **never** implement independent identity lookup rules. |
| Forbidden resolution inputs | Restaurant Name · Slug · Email · Phone · Domain · Operational Number · any mutable attribute |

**Approved pattern**

```
Tenant Identity resolves → Canonical Identity
Business Domain receives Canonical Identity only
```

**Implications:** Orders · Sessions · Checks · Reporting · Realtime · Devices · AI · External integrations — none may invent name/slug/ops-number resolution as identity authority.

---

## 5. Architecture Law — Operational Numbers Are Not Identity

**Definition:** Operational Numbers exist exclusively for **human operations**.

| Operational Numbers **are** | Operational Numbers are **NOT** |
|-----------------------------|----------------------------------|
| Human-readable | Canonical Identity |
| Stable | Primary Keys |
| Support-friendly | Ownership references |
| Operational | Authorization references |
| | Integration identifiers |
| | API identity |
| | Business-relationship keys |

**Canonical Identity remains the only authoritative identity throughout the platform.**

**Examples**

```
Restaurant ID  ≠  Restaurant #000001
Tenant ID      ≠  Tenant #000001
Branch ID      ≠  Branch #001
```

---

## 6. Governance ownership

### Tenant Identity Platform owns

| Artifact |
|----------|
| Hierarchy definitions & **immutable lineage** (**RI-01**) |
| Canonical ID issuance contract |
| **Sole identity resolution** (**RI-03**) |
| Operational numbering policy (**ON-LAW** — ops only) |
| Lifecycle state machine |
| Accountable-owner attributes & membership bindings |
| Controlled migration procedures (Architecture-approved) |
| External reference resolution to canonical IDs (**RI-02**) |
| Identity audit events |

### Tenant Identity does **not** own

| Artifact | Owner |
|----------|-------|
| Credentials / sessions | Authentication |
| Roles / permissions / Role→Permission map | RBAC |
| Plans / entitlements | Subscription |
| Order/Check/Menu business rules | Domains |
| Device canonical device IDs | Device Management (binds to Restaurant/Branch) |

---

## 7. Change control

| Change | Authority |
|--------|-----------|
| New entity type in hierarchy | Architecture Authority + ADR |
| ID format philosophy change | Architecture Authority — must preserve immutability for existing IDs |
| Operational renumbering | Forbidden except break-glass program |
| **Lineage / parent change on existing ID** | **Always forbidden** (**RI-01**). Restructuring = Architecture-approved migration that mints **new** IDs |
| Ownership model change | Architecture Authority |

---

## 8. NFR mapping

| NFR | How principles satisfy |
|-----|------------------------|
| Enterprise ready | Hierarchy, lineage immutability, audit |
| Multi-tenant | Tenant boundary SSOT |
| Cloud native / scalable | Opaque unique IDs; no central semantic encoding |
| Auditable | TIP-13 |
| International / region independent | No region-in-ID; metadata separate |
| Backward compatible | Aliases resolve **only** via Tenant Identity (**RI-03**) |
| Operationally friendly | Operational numbers as human labels only (**ON-LAW**) |
| External stability | **RI-02** |
