# Mirror Integrity Specification

| Field | Value |
|-------|-------|
| **Program** | REPORTING-CONSTITUTION-ENFORCEMENT-1 |
| **Constitution** | GOV-11 · GOV-06 |
| **Date** | 2026-07-27 |

## Integrity rule

`Operational Mirror ≡ approved Governance decision`  
If not equal → **Governance wins** → correct the mirror.

## Primary mirrors & governance SSOT

| Operational Mirror | Governance SSOT | Integrity check |
|--------------------|-----------------|-----------------|
| `EXECUTIVE_SUMMARY_KPI_IDS` | Executive KPI Registry (Stage 6 / Class 1) | Exact set of KPI ids; no extras; no missing certified Exec KPIs |
| Payment Overview on Executive | Widget Scope Matrix + Executive protection | Present only if governance permits E |
| `preferredKpiLabel` / Product Semantics names | KPI-04 Business Names + dictionary names | No synonym leakage (e.g. Gross Sales) |
| Reports four-area nav | UX-06 + Analytics Scope Matrix | Areas match approved scopes |
| Excel / PDF labels & KPI set | KPI-05 + Scope X + dictionary | Semantics identical to Dashboard |
| `kpiDictionary` formulas/owners | Business/Architectural Truth + KPI-01…03 | No alternate meaning vs laws/ADRs |

## Forbidden corrections

| Situation | Forbidden response | Required response |
|-----------|--------------------|-------------------|
| Mirror has unauthorized Executive KPI | Change Executive Registry to include it | Remove from mirror; run promotion if desired |
| UI uses old label | Update Governance Business Name to match UI | Fix UI / productSemantics to approved name |
| Export diverges | Declare “export exception” without ADR | Align export or ADR under GOV-10 |

## Integrity evidence (per release)

- Diff of mirrors vs registries  
- Statement: “No governance edited to match runtime”  
- Corrective PRs for any drift (GOV-13)
