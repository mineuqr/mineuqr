# Production Certification (Architecture Ops)

| Field | Value |
|-------|-------|
| **Program** | ARCHITECTURE-GOVERNANCE-OPERATIONS-1 |
| **Type** | Architecture Ops |
| **Date** | 2026-07-27 |
| **Normative anchors** | §28 · [Program-Certification.md](../governance/Program-Certification.md) · GOV-12…14 (Reporting) |

## Rule

No program becomes **Production Certified** without passing all required gates. Architecture Authority grants the status.

## Mandatory gates

| Gate | Verifies | Evidence |
|------|----------|----------|
| **Architecture Review** | ADRs, ownership, Truth Layers, CD-01/02 | Review sign-off · Traceability Matrix |
| **Governance Review** | Constitutions in force / Pending handled; Registry; no mirror inventing policy | Governance checklist · Registry refs |
| **Regression Review** | No unauthorized law/formula/API/schema breaks; tests | CI / test report |
| **Operational Validation** | Agreed env validation (or N/A for pure governance with recorded reason) | UAT / live validation notes |
| **Documentation Review** | Charter, compliance reports, indexes updated | Doc package |
| **Architecture Authority Approval** | Final yes/no | Signed certification statement |

## Reporting-impacting programs (additional)

Must also satisfy GOV-12 Constitutional Validation and GOV-11 Mirror Integrity (governance prevails over runtime).

## Outcomes

| Outcome | Meaning |
|---------|---------|
| Production Certified | All required gates Pass |
| Conditionally Certified | Dated gaps + remediation ADR/exception (existing Program-Certification) |
| Not Certified | Blocked |

## Certification record (minimum)

Program ID · gates table Pass/Fail · ADR IDs · Constitution versions · evidence links · Authority approver · date.

Invalid if any lower Truth Layer contradicts a higher one.
