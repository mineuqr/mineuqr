# Truth Layer Constitution (Program Digest)

| Field | Value |
|-------|-------|
| **Program** | REPORTING-GOVERNANCE-CONSTITUTION-EXTENSION-2 |
| **Normative text** | [`Operational-Mirror-and-Truth-Layer-Constitution-v1.0.md`](../../../architecture/constitution/Operational-Mirror-and-Truth-Layer-Constitution-v1.0.md) |
| **Constitution** | GOV-07 |
| **Date** | 2026-07-27 |

## Four Truth Layers

| Layer | Name | Role | Reporting examples |
|-------|------|------|-------------------|
| 1 | Business Truth | Business reality — supreme | Revenue / Settlement / Refund / Tax Law; financial calendar |
| 2 | Architectural Truth | System structure | Domains, Settlement Record ownership, ADRs, Architecture Constitution |
| 3 | Governance Truth | Platform policy | KPI-01…10, OBJ-01…04, UX-01…07, GOV-01…10, registries |
| 4 | Operational Truth | Runtime execution | `kpiDictionary`, `productSemantics`, Exec allowlist, UI config |

## Assignment rule

Every reporting decision MUST be tagged to exactly one primary Truth Layer. If a change spans layers, higher-layer approval gates apply first.

## Non-redefinition

| Higher decision | Lower must |
|-----------------|------------|
| Total Sales formula (L1/L2 encoded in L4 dictionary) | Present/mirror — not invent alternate meaning |
| Class 1 / Scope E / Stage 6 (L3) | Mirror in allowlist — not self-promote |
| Settlement Record SoT (L2) | Query SR — not Order totals for Total Sales |
