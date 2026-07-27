# Operational vs Governance Boundary Report

| Field | Value |
|-------|-------|
| **Program** | REPORTING-GOVERNANCE-METADATA-CONSTITUTION-1 |
| **Constitution** | GOV-02 · GOV-03 |
| **Date** | 2026-07-27 |

## Boundary table

| Concern | Layer | Current artifact | May drive runtime? |
|---------|-------|------------------|--------------------|
| KPI id / formula / definition | **Operational** | `kpiDictionary.ts` | Yes |
| Business display name | **Operational** | `productSemantics.ts` | Yes (labels) |
| DTO / contract binding | **Operational** | `kpiDictionary` + contracts | Yes |
| Technical ownerDomain / sourceService | **Operational** | `kpiDictionary.ts` | Yes (routing) |
| `kpiClass: business\|operational\|catalog\|customer` | **Operational** | `kpiDictionary.ts` | Yes (catalog typing) — **not** KPI-08 Class 1–5 |
| Executive card allowlist | **Operational implementation** of approved eligibility | `EXECUTIVE_SUMMARY_KPI_IDS` | Yes — must mirror Stage 6 governance, not invent it |
| KPI-08 Class 1–5 | **Governance** | EXTENSION-2 registries | No (docs today) |
| KPI-10 Presentation Scope | **Governance** | EXTENSION-3 registries | No (docs today) |
| KPI-09 Promotion status | **Governance** | EXTENSION-2 policy / Exec registry | No (docs today) |
| GOV / UX / OBJ constitution text | **Governance** | `docs/architecture/constitution/` | No |

## Critical disambiguation

| Term in code | Meaning | Constitutional Class? |
|--------------|---------|------------------------|
| `KpiClass` / `kpiClass` in `kpiDictionary.ts` | Operational catalog family (`business`, `operational`, …) | **No** — not KPI-08 |
| Class 1 Executive … Class 5 Internal | Governance Classification (KPI-08) | **Yes** — docs registries only |

| Historical name | Reality under GOV-02 |
|-----------------|----------------------|
| “KPI Governance Registry” header in `kpiDictionary.ts` | **Operational** metric catalog with ownership/source fields for runtime. Constitutional governance lives in constitution + program registries (and future `governance/` layer). |

## Mixing prohibited

| Anti-pattern | Why forbidden |
|--------------|---------------|
| Adding `promotionStage` into `kpiDictionary` as runtime field without Governance Layer | Embeds governance into operational metadata (GOV-02/04) |
| Using Presentation Scope alone to show a KPI on Executive | Violates GOV-01 / KPI-09 |
| Governance docs importing server query implementations | Violates GOV-05 |
| UI inventing Class/Scope without registry update | Certification failure |

## Current compliance posture

Baseline is **compliant** if:

- Class / Scope / Promotion remain in docs registries  
- `kpiDictionary` / `productSemantics` stay metric + label operational SSOT  
- Executive allowlist only reflects approved Stage 6 set  

No runtime change in this program.
