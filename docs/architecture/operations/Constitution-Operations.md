# Constitution Operations

| Field | Value |
|-------|-------|
| **Program** | ARCHITECTURE-GOVERNANCE-OPERATIONS-1 |
| **Type** | Architecture Ops |
| **Date** | 2026-07-27 |
| **Normative anchors** | CV-01…06 · [Constitution Registry](../constitution/Constitution-Registry.md) · GOV-16 |

## Purpose

Operate constitutions using the Versioning Framework — without creating parallel versioning rules.

## Operating flow

```
Creation (Draft)
  ↓
Review (Pending Review)
  ↓
Approval (Approved)
  ↓
Versioning (SemVer on header + Registry)
  ↓
Adoption (Adopted / Effective Date)
  ↓
Deprecation (when superseded)
  ↓
Archiving (retention)
```

Statuses = CV-04. Deletion prohibited.

## Creation

- CV-01 header required  
- Register as Draft in Constitution Registry  
- Must not duplicate existing constitution (GOV-16 / CD-05)  
- Enterprise vs domain ownership per CD-05  

## Review / Approval / Adoption

- ARB review → Architecture Authority Approved → Adopted  
- Update Registry + Governance indexes  
- Reporting constitutions also subject to GOV-12 validation when reporting-impacting programs ship  

## Versioning

- Major / Minor / Patch per CV-02  
- Breaking → ADR + Architecture Review + Authority (CV-03)  
- Successor must include CV-05 compatibility block  

## Relationship with ADRs

| Situation | Artifact |
|-----------|----------|
| New constitutional behaviour | Often ADR first, then constitution Major |
| Clarify wording only | Constitution Minor; ADR optional |
| Domain ownership change | ADR mandatory (CD-01 / CV-03) |
| Exception to constitution | Exception Ops — not silent edit |

## Ops checklist (per transition)

- [ ] CV-01 fields updated  
- [ ] Registry row updated  
- [ ] Indexes (`Governance.md` / README) updated if Adopted/Deprecated  
- [ ] Dependent mirrors noted if Reporting (GOV-11) — mirror updates after adoption, never before inventing policy  
