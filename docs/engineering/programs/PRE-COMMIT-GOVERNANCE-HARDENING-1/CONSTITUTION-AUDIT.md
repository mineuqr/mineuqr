# Constitution Audit

| Field | Value |
|-------|-------|
| **Program** | PRE-COMMIT-GOVERNANCE-HARDENING-1 |
| **Rules** | CV-01 · CV-06 |
| **Date** | 2026-07-27 |

## Registry coverage

| Unique Name | File exists | Registry row | CV-01 complete after hardening |
|-------------|-------------|--------------|--------------------------------|
| Architecture Constitution | Yes | Yes | Adopted (legacy header; Ver 1.0.0) |
| Architecture North Star | Yes | Yes | Part of Architecture Constitution |
| Quality Attributes | Yes | Yes | Part of Architecture Constitution |
| Ordering Invariants | Yes | Yes | Normative part |
| Architecture Constitution Versioning Framework | Yes | Yes | Yes |
| Enterprise Architecture Governance Framework | Yes | Yes | Yes |
| Reporting UX Constitution | Yes | Yes | Yes (hardened) |
| KPI Ownership Constitution | Yes | Yes | Yes (hardened) |
| Object Model & KPI Lifecycle | Yes | Yes | Yes (hardened) |
| Classification & Promotion | Yes | Yes | Yes (hardened) |
| Presentation Scope | Yes | Yes | Yes (hardened) |
| Executive Eligibility & Governance Metadata | Yes | Yes | Yes (hardened) |
| Operational Mirror & Truth Layer | Yes | Yes | Yes (hardened) |
| Reporting Constitution Enforcement Framework | Yes | Yes | Yes (hardened) |

## Non-constitutions (correctly excluded)

| Artifact | Classification |
|----------|----------------|
| Architecture Governance Operations | Operating framework |
| `docs/architecture/governance/*` | Process docs |
| ADR Registry | Constitutional index (not a domain constitution) |
| Compliance.md / Decision Hierarchy | Architecture Constitution satellites |

## Status policy

All new Reporting / Enterprise / Versioning / Enforcement constitutions remain **Pending Review** until Architecture Authority adoption. That is expected — not a registry defect.

## Version policy

SemVer normalized to **1.0.0** (was mixed `1.0` / `1.0.0`). Filename `…-v1.0.md` remains acceptable per CV-02 convention.
