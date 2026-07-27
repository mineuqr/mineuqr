# Architecture Constitution Versioning Framework v1.0

| Field | Value |
|-------|-------|
| **Unique Name** | Architecture Constitution Versioning Framework |
| **Version** | **1.0.0** |
| **Status** | Pending Review |
| **Approval Authority** | Architecture Authority |
| **Effective Date** | Upon Architecture Authority adoption |
| **Previous Version** | — (initial) |
| **Successor Version** | — |
| **Program** | ARCHITECTURE-CONSTITUTION-VERSIONING-1 |
| **Domain** | Platform-wide (all constitutions) |

> **Related:** [Architecture Constitution v1.0](./Architecture-Constitution-v1.0.md) · [Constitution Registry](./Constitution-Registry.md) · [Governance](./Governance.md) · [ADR Lifecycle](../governance/ADR-Lifecycle.md)

---

## Constitutional status

This framework is the permanent **versioning policy for all MineuQR Constitutions** (Architecture, Reporting, and future domain constitutions).

It governs lifecycle, numbering, breaking changes, evolution, backward compatibility, and adoption.

Governance only — no runtime, API, or database changes.

---

## RULE CV-01 — Constitution Version Ownership

Every Constitution MUST declare:

| Field | Requirement |
|-------|-------------|
| Unique Name | Stable identity string |
| Version | SemVer per CV-02 (`MAJOR.MINOR.PATCH`) |
| Status | Lifecycle state per CV-04 |
| Approval Authority | Normally Architecture Authority |
| Effective Date | Date adopted / effective (or “Upon adoption”) |
| Previous Version | Prior SemVer or `—` if initial |
| Successor Version | Next SemVer or `—` if current |

Missing CV-01 metadata is a **Governance Violation** for new or revised constitutions.

---

## RULE CV-02 — Version Numbering

### Major (`X.0.0`)

Increment only when:

- constitutional behaviour changes  
- authority changes  
- ownership changes  
- governance model changes  

### Minor (`x.Y.0`)

Increment when:

- clarification  
- wording improvements  
- examples  
- documentation enhancements  

(No change to binding behaviour.)

### Patch (`x.y.Z`)

Increment when:

- typo · formatting · grammar  

No architectural meaning.

**Convention:** Documents titled `…-v1.0.md` map to SemVer **1.0.0** unless a fuller SemVer is stated in the document header.

---

## RULE CV-03 — Breaking Constitutional Changes

Breaking changes (typically Major bumps) require:

1. ADR  
2. Architecture Review  
3. Architecture Authority Approval  

Breaking changes MUST NEVER bypass review.

Examples of breaking: rule repeal, authority transfer, ownership model change, Truth Layer redefinition, mandatory certification gate change that invalidates prior certifications without migration.

---

## RULE CV-04 — Constitution Lifecycle

```
Draft
  ↓
Pending Review
  ↓
Approved
  ↓
Adopted
  ↓
Deprecated
  ↓
Archived
```

| State | Meaning |
|-------|---------|
| Draft | Authoring; not binding |
| Pending Review | Submitted to Architecture Authority |
| Approved | Authority approved; not yet effective if Effective Date future |
| Adopted | Binding / ratified / in force |
| Deprecated | Superseded; still readable; must not be used for new work |
| Archived | Historical retention |

**Deletion is prohibited.** Superseded texts remain via Deprecated → Archived.

---

## RULE CV-05 — Backward Compatibility

A newer Constitution SHALL explicitly define:

- Compatibility with prior version  
- Migration requirements  
- Replaced / superseded constitutions  
- Affected domains  

Silent supersession is prohibited.

---

## RULE CV-06 — Constitution Registry

Every Constitution MUST be registered in the [Constitution Registry](./Constitution-Registry.md).

Registry SHALL include: Version · Status · Domain · Owner · Dependencies · Related ADRs.

Unregistered constitutions MUST NOT be treated as Adopted.

---

## Adoption process (normative)

1. Author Draft with CV-01 header  
2. Register as Draft / Pending Review  
3. Architecture Review  
4. Architecture Authority → Approved → Adopted (set Effective Date)  
5. Update Registry + dependent indexes  
6. Major/breaking: ADR first (CV-03)

---

## Relationship to Reporting GOV-16

GOV-16 (Constitution Stability) remains in force for Reporting. This framework supplies the **platform-wide** versioning mechanics for all constitutions, including Reporting.
