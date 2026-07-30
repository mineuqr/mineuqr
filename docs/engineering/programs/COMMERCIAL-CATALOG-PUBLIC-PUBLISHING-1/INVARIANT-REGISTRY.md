# INVARIANT REGISTRY — COMMERCIAL-CATALOG-PUBLIC-PUBLISHING-1

| Field | Value |
|-------|-------|
| **Program** | COMMERCIAL-CATALOG-PUBLIC-PUBLISHING-1 |
| **Role** | Official invariant registry for the Commercial Catalog Publishing Platform |
| **Amendment** | Revision 1 — **I-CPP-01** |
| **Date** | 2026-07-30 |

---

## Registry

| ID | Name | Statement | Origin | Status |
|----|------|-----------|--------|--------|
| **I-CPP-01** | Published Catalog Isolation | Published Catalog SHALL NEVER become a Runtime Authority. It SHALL NOT evaluate Features, Limits, Subscription lifecycle, commercial eligibility, or runtime authorization; SHALL NOT be consulted by runtime authorization paths; SHALL remain a read-only publication surface for commercially published offerings. | ARCHITECTURE_AMENDMENT_REV1 | **Adopted** |
| Commercial Snapshot Invariant | Bound Snapshot immutability | Bound Snapshot permanently immutable; runtime commercial facts from Snapshot only — never mutable Catalog. | COMMERCIAL-PLAN-LIFECYCLE-EXPERIENCE-1 | Inherited · Preserved |
| **I-CPL-13** | Snapshot Identity | Exactly one active Snapshot per Subscription; plan change → new Snapshot; historical preserved; never overwrite/repoint. | COMMERCIAL-PLAN-LIFECYCLE-EXPERIENCE-1 Rev 1 | Inherited · Preserved |
| **I-SRE-01** | Runtime Entitlement Authority | Subscription Runtime is the exclusive runtime entitlement decision engine. | SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1 Rev 1 | Inherited · Preserved |
| **I-SRE-02** | Capability Enforcement Completeness | Every commercial capability maps to exactly one entitlement / Runtime enforcement point. | SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1 Rev 2 | Inherited · Untouched |

---

## I-CPP-01 detail

### Normative prohibitions

1. SHALL NOT evaluate Feature entitlements  
2. SHALL NOT evaluate Limits  
3. SHALL NOT evaluate Subscription lifecycle state  
4. SHALL NOT evaluate Commercial eligibility  
5. SHALL NOT resolve runtime authorization decisions  
6. SHALL NOT be consulted by runtime authorization paths  

### Normative permission

Published Catalog MAY expose read-only published offerings, published metadata, and version visibility for discovery/browse only.

### Companion invariants

- **I-SRE-01** — Runtime is exclusive authority (positive duty)  
- **I-CPP-01** — Published Catalog must not become / feed authority (negative duty)  
- **I-CPL-13** / Snapshot Invariant — Snapshot is sole runtime contract  

---

## Change control

New I-CPP-* invariants require Architecture Authority amendment. Implementation changes are out of band for registry-only amendments.
