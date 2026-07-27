# Constitutional Compliance Report

| Field | Value |
|-------|-------|
| **Program** | REPORTING-UX-CONSTITUTION-1 |
| **Date** | 2026-07-27 |
| **Scope** | Governance adoption + current reporting stack alignment |
| **Code changes in this program** | None (docs only) |

## Rule-by-rule compliance

### Reporting UX Constitution

| Rule | Status | Evidence |
|------|--------|----------|
| UX-01 Business questions first | **PASS** | Business Question Registry; Simplification Exec cards answer decisions |
| UX-02 One component = one question | **PASS** | Registry maps each Exec card to one question |
| UX-03 No duplicate questions | **PASS** *(baseline)* | REPORTING-UX-SIMPLIFICATION-1 duplicate merge; Gross/Check Revenue synonyms retired in terminology program |
| UX-04 Executive simplicity | **PASS** | Max 6 Exec cards; averages/rates off Overview |
| UX-05 Progressive disclosure | **PASS** | Overview · Sales · Financial · Exports |
| UX-06 Navigation simplicity | **PASS** | Four business areas; technical routes not exposed as product nav |
| UX-07 Business Language | **PASS** | `productSemantics.ts` + terminology governance |

### KPI Ownership Constitution

| Rule | Status | Evidence |
|------|--------|----------|
| KPI-01 One owner | **PASS** with observation | Dictionary write owners + plane clarification in Ownership Registry |
| KPI-02 One source of truth | **PASS** | Settlement Record vs Order Read vs Reporting derivation |
| KPI-03 One definition | **PASS** | `kpiDictionary.ts` SSOT |
| KPI-04 One business name | **PASS** | `productSemantics.ts` |
| KPI-05 Cross-platform consistency | **PASS** *(baseline)* | Rationalization + Simplification Excel/PDF alignment |
| KPI-06 Ownership integrity | **PASS** | No ownership migration in this program |

## Observations (not violations)

1. **Settlement Platform vs Check Management** — Mission language uses “Settlement Platform” for financial KPIs; `kpiDictionary` records write owner as Check Management. Constitution dual-layer model resolves this; no formula or ownerDomain change.
2. **Payment Overview** — Presentation card (`paymentOverview`), not a `KpiId`. Governed under UX-02 / KPI-01 as Settlement payment publication; elevating to registry KPI requires dictionary + ADR path.
3. **Adoption status** — Constitutions are authored and indexed; formal Product Constitution elevation awaits Architecture Authority approval (this package).

## Architecture protection (unchanged)

| Surface | Modified by this program? |
|---------|---------------------------|
| Financial calculations / Revenue / Refund / Tax / Settlement Law | No |
| Reporting formulas | No |
| APIs / Database / Domain ownership | No |
| Event / read / write models | No |

## Certification gate

Future reporting features MUST complete the compliance checklist in KPI Ownership Constitution before Production Certification.

## Verdict contribution

Supports **B. Adopted with observations** pending Architecture Authority approval.
