# Compliance Report

| Field | Value |
|-------|-------|
| **Program** | REPORTING-UX-CONSTITUTION-EXTENSION-3 |
| **Constitution** | KPI-10 |
| **Date** | 2026-07-27 |

## Object release checklist (applied to current baseline)

| Object | Type | Class | Owner plane | Scope | Promotion | Complete? |
|--------|------|-------|-------------|-------|-----------|-----------|
| Total Sales | KPI | 1 | Settlement | E·F·X | Stage 6 | Yes |
| Sales Orders | KPI | 1 | Order | E·O·X | Stage 6 | Yes |
| Orders | KPI | 1 | Order | E·O·X | Stage 6 | Yes |
| Refund Amount | KPI | 1 | Settlement | E·F·X | Stage 6 | Yes |
| Tax Collected | KPI | 1 | Settlement | E·F·X | Stage 6 | Yes |
| Payment Overview | Widget | N/A | Settlement payment | E·F·X | Governed companion | Yes |
| Net Sales | KPI | 3 | Reporting (derived) | F·D·X | N/A Exec | Yes |
| Average Order / Check / Refund Rate | KPI | 4 | Various | D·X | Barred from E | Yes |

## Presentation rules check

| Rule | Result |
|------|--------|
| No object outside approved scope (baseline Simplification) | **PASS** |
| Diagnostic off Executive | **PASS** |
| Internal never customer-facing | **PASS** |
| Export meaning preserved | **PASS** (KPI-05 baseline) |

## Gaps (observations)

- Presentation Scope not yet a machine field in `kpiDictionary.ts` — registries are governance SSOT until a future encoding program.  
- Some Class 2 KPIs may lack restaurant UI today; Scope still declared for future placement control.
