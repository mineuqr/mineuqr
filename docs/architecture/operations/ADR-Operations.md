# ADR Operations

| Field | Value |
|-------|-------|
| **Program** | ARCHITECTURE-GOVERNANCE-OPERATIONS-1 |
| **Type** | Architecture Ops |
| **Date** | 2026-07-27 |
| **Normative anchors** | Architecture Constitution §26 · [ADR Lifecycle](../governance/ADR-Lifecycle.md) · CV-03 |

## Purpose

Operate ADRs day-to-day. Constitutional ADR statuses in `ADR-Lifecycle.md` remain authoritative. This document maps **operational workflow** onto them.

## Operational lifecycle (Ops view)

```
Proposed
  ↓
Review
  ↓
Approved          (= constitutional Accepted)
  ↓
Implemented
  ↓
Verified          (= evidence that implementation matches ADR)
  ↓
Superseded (optional)
  ↓
Archived          (= historical retention; no deletion)
```

### Status mapping

| Ops status | Constitutional status (`ADR-Lifecycle.md`) |
|------------|--------------------------------------------|
| Proposed | Proposed (from Draft) |
| Review | Proposed (under review) |
| Approved | Accepted |
| Implemented | Implemented |
| Verified | Implemented + certification evidence recorded |
| Superseded | Superseded |
| Archived | Deprecated / Superseded retained in registry |

Draft and Rejected remain as in constitutional lifecycle.

## ADR numbering

- Pattern: `ADR-ARCH-NNN` (existing convention) or domain prefix if Architecture Authority authorizes  
- Numbers assigned at Proposed; never reused  
- Registry: [ADR-Registry.md](../constitution/ADR-Registry.md)

## Approval process

1. Author drafts from [ADR-Template.md](../templates/ADR-Template.md)  
2. Submit Proposed → ARB / Technical Reviewers  
3. Architecture Authority Accept or Reject  
4. Register in ADR Registry  
5. Implementation programs cite ADR IDs in charter  

## Review process

- Async review default; sync ARB if contested (see Architecture-Review-Board)  
- Checks: Truth Layer fit, CD-01/02, no Business Law rewrite without explicit scope, migration plan  

## Superseding

- New ADR must name prior ADR and migration  
- Prior → Superseded; never delete  
- Update Registry and dependent program docs  

## Retirement / archive

- Deprecated or Superseded ADRs remain readable  
- Archived = no longer active for new work; still auditable  

## Traceability

Every Accepted ADR must be citable from programs, certifications, and (when relevant) constitution CV-05 / CD-04 resolutions.
