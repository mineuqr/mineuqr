# FINAL REPORT — TENANT-IDENTITY-PLATFORM-ARCHITECTURE-1

**Date:** 2026-07-29  
**Status:** READY FOR ARCHITECTURE AUTHORITY FINAL REVIEW  
**Type:** Architecture Design · Architecture Authority mode  
**Revision:** RI-01 Identity Lineage · RI-02 External Reference Stability · RI-03 Identity Resolution Authority · ON-LAW Operational Numbers Are Not Identity  
**Constraints:** Architecture only · No implementation · No runtime/API/UI/schema/migration changes · No commit / push / deploy · **ADR-ARCH-035 not published**  
**Prerequisite:** RBAC-PLATFORM-ARCHITECTURE-1  

---

## 1. Executive Summary

MineuQR now has a **canonical Tenant Identity Platform architecture**: the SSOT for Organization → Tenant → Restaurant → Branch hierarchy, ownership, lifecycle, canonical identifiers, operational numbering (human ops only), membership bindings, and reference contracts.

Identity is a **permanent platform contract**. It must never depend on restaurant name, email, domain, phone, owner display, or database surrogates. Runtime remains unchanged.

**Constitutional additions (this revision):**

| ID | Principle | One-line law |
|----|-----------|--------------|
| **RI-01** | Identity Lineage | Permanent parent; never reassign; migration ≠ reparent; accountable-owner transfer ≠ lineage change |
| **RI-02** | External Reference Stability | External refs (URL/QR/API/webhook/integration) bound to Canonical Identity; survive business-data changes |
| **RI-03** | Identity Resolution Authority | TIP sole resolver; domains consume Canonical IDs only — never name/slug/email/phone/ops# |
| **ON-LAW** | Operational Numbers Are Not Identity | Ops labels only; `Restaurant ID ≠ Restaurant #000001` |

**Plane law:** Identity identifies who/owns what · Subscription defines what is purchased · RBAC authorizes access · AI consumes IDs and never mutates identity.

---

## 2. Architecture Overview

```
Platform → Organization → Tenant → Restaurant → Branch
                │
                ├── Immutable lineage (RI-01)
                ├── Membership bindings (User ↔ scope)
                ├── Canonical IDs (sole authoritative identity)
                └── Operational Numbers (human/ops labels only — ON-LAW)
```

Details: [ARCHITECTURE-OVERVIEW.md](./ARCHITECTURE-OVERVIEW.md).

---

## 3. Identity Hierarchy

Canonical containment with **permanent** single parent (**RI-01**). Resolution of the chain is TIP-only (**RI-03**). Interim: Restaurant ≈ Tenant until Foundation ships.

Details: [IDENTITY-HIERARCHY.md](./IDENTITY-HIERARCHY.md).

---

## 4. Identifier Model

Canonical IDs: Immutable · globally unique · never reused · never reparented · never inferred · opaque · independent of DB IDs.

Format codec **unbound**. External refs use Canonical IDs (**RI-02**).

Details: [IDENTIFIER-MODEL.md](./IDENTIFIER-MODEL.md).

---

## 5. Operational Numbering

Stable human labels (e.g. `Restaurant #000001`) — **not** identity, PKs, ownership, authz, API, or integration keys (**ON-LAW**).

Details: [OPERATIONAL-NUMBERING.md](./OPERATIONAL-NUMBERING.md).

---

## 6. Lifecycle Model

`Created → Provisioned → Active ⇄ Suspended → Archived → Deleted (logical)`.

Accountable-owner transfer allowed; same-ID hierarchy reparent **forbidden**. Restructuring via controlled migration.

Details: [LIFECYCLE-MODEL.md](./LIFECYCLE-MODEL.md).

---

## 7. Ownership Model

Platform → Org → Tenant → Restaurant → Branch lineage is permanent. Accountable-user transfer ≠ reparenting. Enterprise restructuring = Architecture-approved migration (typically archive + new IDs).

Details: [OWNERSHIP-MODEL.md](./OWNERSHIP-MODEL.md).

---

## 8. Reference Model

Internal/API/AI/QR/webhooks → Canonical IDs · Support may *display* ops numbers · Alias resolution only via TIP · Domains never independent lookup.

Details: [REFERENCE-MODEL.md](./REFERENCE-MODEL.md).

---

## 9. Governance Principles

**TIP-01…TIP-15** plus **RI-01 · RI-02 · RI-03 · ON-LAW**.

Details: [GOVERNANCE-PRINCIPLES.md](./GOVERNANCE-PRINCIPLES.md) · [TENANT-BOUNDARY.md](./TENANT-BOUNDARY.md).

---

## 10. Compatibility Analysis

| Plane | Relationship |
|-------|--------------|
| **Subscription** | Identity = who; Subscription = commercial what; no reparent via billing |
| **RBAC** | Identity = ownership/lineage; RBAC = access; scopes = Canonical IDs |
| **AI / Domains** | Consume Canonical IDs; never resolve or mutate identity |

Details: [COMPATIBILITY.md](./COMPATIBILITY.md).

---

## 11. ADR Recommendations

Recommend **ADR-ARCH-035** with **RI-01 · RI-02 · RI-03 · ON-LAW** as mandatory governing principles.

**Not published** — await Architecture Authority final acceptance.

Details: [ADR-RECOMMENDATIONS.md](./ADR-RECOMMENDATIONS.md).

---

## 12. Risk Assessment · 13. Future Roadmap

See [RISK-ASSESSMENT.md](./RISK-ASSESSMENT.md) · [FUTURE-ROADMAP.md](./FUTURE-ROADMAP.md).

---

## Revision validation

| Check | ✓ |
|-------|---|
| Identity lineage immutable | ✓ |
| Parent-child reassignment prohibited | ✓ |
| Relocation requires controlled migration | ✓ |
| External refs stable after business-data changes | ✓ |
| Business Domains never resolve identity independently | ✓ |
| TIP exclusively owns identity resolution | ✓ |
| Operational Numbers = ops references only | ✓ |
| Canonical Identity = sole authoritative identifier | ✓ |
| No contradictions across documents | ✓ |

---

## Success criteria verification

| Criterion | ✓ |
|-----------|---|
| Canonical identity hierarchy | ✓ |
| Canonical identifier model | ✓ |
| Operational numbering model | ✓ |
| Identity lifecycle | ✓ |
| Ownership model | ✓ |
| Reference model | ✓ |
| Governance principles | ✓ |
| Tenant isolation | ✓ |
| RBAC / Subscription / AI compatibility | ✓ |
| Future extensibility | ✓ |
| **RI-01 documented** | ✓ |
| **RI-02 documented** | ✓ |
| **RI-03 documented** | ✓ |
| **ON-LAW documented** | ✓ |
| ADR-035 recommendation references all four | ✓ |
| All affected documents updated | ✓ |
| No implementation | ✓ |
| ADR-ARCH-035 not published | ✓ |

---

## Package index

[00-PROGRAM-PACKAGE.md](./00-PROGRAM-PACKAGE.md)

---

## Final verdict

# READY FOR ARCHITECTURE AUTHORITY FINAL REVIEW

Documentation revision only.  
No runtime changes.  
No code changes.  
No schema changes.  
No migrations.  
No commits.  
No deployment.

**Await Architecture Authority final acceptance before ADR-ARCH-035 publication or any Foundation program.**
