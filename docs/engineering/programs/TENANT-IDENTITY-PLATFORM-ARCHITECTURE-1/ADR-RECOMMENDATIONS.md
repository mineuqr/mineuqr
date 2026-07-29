# ADR Recommendations

**Program:** TENANT-IDENTITY-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only — ADRs **recommended**, not published by this program  
**Date:** 2026-07-29  
**Revision:** RI-01 · RI-02 · RI-03 · ON-LAW — **do not publish ADR-ARCH-035 until Architecture Authority final acceptance**

Prerequisite program RBAC-PLATFORM-ARCHITECTURE-1 recommended **ADR-ARCH-035** for Tenant Identity. That number is adopted here as the primary recommendation (subject to Registry at publication time).

---

## 1. Recommended primary ADR

### ADR-ARCH-035 — Tenant Identity Platform (Ownership, Hierarchy & Identifiers)

| Field | Proposed value |
|-------|----------------|
| **Status** | Draft → Proposed (upon Architecture Authority **final acceptance** after this revision) |
| **Owner** | Architecture Authority |
| **Program** | TENANT-IDENTITY-PLATFORM-ARCHITECTURE-1 |
| **Supersedes** | — |
| **Related** | RBAC-PLATFORM-ARCHITECTURE-1 · recommended ADR-ARCH-034 (RBAC) |

#### Context

MineuQR uses Restaurant rows and mutable attributes as de facto tenancy identity. Enterprise multi-tenant operation requires a permanent identity contract independent of names, emails, domains, phones, owners, and database surrogates — with immutable lineage, stable external references, and sole resolution authority.

#### Decision (proposed)

1. Establish **Tenant Identity Platform** as SSOT for Organization → Tenant → Restaurant → Branch hierarchy, ownership, lifecycle, membership bindings, canonical IDs, and operational numbers.  
2. Mandate principles **TIP-01…TIP-15**.  
3. Canonical IDs are opaque, globally unique, never reused/reassigned/inferred; operational numbers are human-facing complements only.  
4. Tenant is the primary isolation boundary; Platform support crosses only via RBAC — not ownership.  
5. Subscription attaches to Identity; RBAC authorizes access; neither plane owns the other.  
6. AI consumes canonical IDs; never creates/modifies identity; respects Tenant boundaries.  
7. **Mandate RI-01 — Identity Lineage** as a governing principle.  
8. **Mandate RI-02 — External Reference Stability** as a governing principle.  
9. **Mandate RI-03 — Identity Resolution Authority** as a governing principle.  
10. **Mandate Architecture Law — Operational Numbers Are Not Identity (ON-LAW)** as a governing principle.

#### Mandatory governing principles (must appear in ADR-ARCH-035)

When published, ADR-ARCH-035 **shall** adopt TIP-01…TIP-15 and explicitly include normative text for:

| ID | Title | Mandatory statement (summary) |
|----|-------|-------------------------------|
| **RI-01** | Identity Lineage | Identity lineage is immutable. Every canonical identity has exactly one permanent parent (Platform→Organization→Tenant→Restaurant→Branch). Parent-child relationships are architectural contracts. Canonical identities must never be reassigned to a different parent. Identity relocation is prohibited outside explicit platform-approved migration procedures. Ownership/accountable-party transfer must never mutate identity lineage. Organizational restructuring uses controlled migration — not identity reassignment. |
| **RI-02** | External Reference Stability | All externally exposed references resolve through Canonical Identity and remain stable regardless of changes to business attributes (name, owner, email, phone, domain, brand). External refs include public URLs, QR codes, API identifiers, webhooks, integrations, and customer-facing references. |
| **RI-03** | Identity Resolution Authority | Tenant Identity Platform is the sole authority for identity resolution. Business Domains consume resolved Canonical Identities only and must never implement independent lookup using name, slug, email, phone, domain, operational number, or other mutable attributes. |
| **ON-LAW** | Operational Numbers Are Not Identity | Operational Numbers exist exclusively for human operations. They are not Canonical Identity, primary keys, ownership references, authorization references, integration identifiers, API identity, or business-relationship keys. Canonical Identity is the only authoritative identity. `Restaurant ID ≠ Restaurant #000001` (and equivalents). |

#### Consequences

| + | − |
|---|---|
| Stable contract for all platforms | Multi-program adoption from Restaurant-centric model |
| Clear ownership, lineage, isolation | Interim dual-read (Restaurant ≈ Tenant) |
| Ops-friendly numbers without DB or identity coupling | Issuance + migration discipline required |
| Stable QR/API/webhook refs (**RI-02**) | Alias cutovers must go through TIP |
| Domains cannot fork lookup logic (**RI-03**) | Legacy name/slug resolvers need retirement programs |

**This program does not create the ADR file or update the Registry.**  
**Do not publish ADR-ARCH-035 until this revision is Architecture Authority finally accepted.**

---

## 2. Supporting ADR candidates (later)

| ID (suggested) | Title | When |
|----------------|-------|------|
| ADR-ARCH-034 | RBAC Platform Architecture | RBAC program publication (prerequisite track) |
| ADR-ARCH-036+ | Identity Foundation issuance format | When ID codec chosen in implementation |
| — | Controlled identity migration procedures | Enterprise restructuring programs |
| — | Membership & invite flows | Staff adoption program |

---

## 3. Publication checklist (future)

- [ ] Architecture Authority **finally accepts** TENANT-IDENTITY-PLATFORM-ARCHITECTURE-1 (including RI-01 · RI-02 · RI-03 · ON-LAW)  
- [ ] Confirm ADR number with Registry (035 preferred)  
- [ ] Draft ADR from template with TIP-01…15 + **RI-01 · RI-02 · RI-03 · ON-LAW** mandatory  
- [ ] Register + link this package  
- [ ] No runtime implementation until Foundation program certified  

---

## 4. Explicit non-ADRs

- Authentication redesign  
- RBAC permission catalog (ADR-034 track)  
- Subscription SKU design  
- Schema/migration design  
- Financial document identity (ADR-ARCH-027)
