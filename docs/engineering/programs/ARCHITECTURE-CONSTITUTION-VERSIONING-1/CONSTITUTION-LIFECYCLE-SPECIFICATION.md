# Constitution Lifecycle Specification

| Field | Value |
|-------|-------|
| **Program** | ARCHITECTURE-CONSTITUTION-VERSIONING-1 |
| **Constitution** | CV-04 |
| **Date** | 2026-07-27 |

## State machine

```
Draft → Pending Review → Approved → Adopted → Deprecated → Archived
```

Deletion is prohibited at every state.

## Transitions

| From | To | Gate |
|------|-----|------|
| — | Draft | Author creates CV-01 header + Registry row |
| Draft | Pending Review | Submitted to Architecture Authority |
| Pending Review | Approved | Architecture Review complete; Authority approves text |
| Approved | Adopted | Effective Date reached / Authority declares in force |
| Pending Review | Draft | Authority returns for revision |
| Adopted | Deprecated | Successor Adopted **or** ADR retires constitution |
| Deprecated | Archived | Retention policy / Authority archive order |
| Approved | Deprecated | Rare — superseded before effective; ADR recommended |

## Status synonym map (legacy docs)

| Legacy wording | CV-04 Status |
|----------------|--------------|
| Ratified Constitution | Adopted |
| Pending Architecture Authority adoption | Pending Review |
| Pending | Pending Review |
| Production Certified (programs) | **Not** a constitution status — program certification ≠ constitution Adopted |

## Evidence per transition

Update: document header (CV-01) · Constitution Registry · Governance indexes · (if Major) ADR.
