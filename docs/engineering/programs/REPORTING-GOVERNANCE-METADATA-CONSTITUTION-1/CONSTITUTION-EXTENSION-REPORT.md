# Constitution Extension Report

| Field | Value |
|-------|-------|
| **Program** | REPORTING-GOVERNANCE-METADATA-CONSTITUTION-1 |
| **Date** | 2026-07-27 |

## What this extension adds

| Addition | Rules |
|----------|-------|
| Executive Eligibility clarity | GOV-01 — Scope necessary, Promotion sufficient gate |
| Metadata separation | GOV-02 — Operational vs Governance |
| Layer separation | GOV-03 |
| Future Governance Layer proposal | GOV-04 — dedicated package, no calc |
| One-way dependency | GOV-05 |

## Ambiguity eliminated

| Before | After |
|--------|-------|
| Scope E read as “put on Executive” | Scope E = permitted locations; eligibility = KPI-09 |
| `kpiDictionary` “governance” naming conflated with constitution | Dictionary = Operational Metadata; constitution registries = Governance Metadata |
| Risk of stuffing Class/Scope into dictionary | Explicitly prohibited; future `governance/` layer only |

## Observations (not violations)

1. **`kpiClass` in code ≠ KPI-08 Class** — operational catalog family; documented in Boundary Report.  
2. **Historical “KPI Governance Registry” title** on `kpiDictionary.ts` is operational catalog naming; rename deferred to a future cleanup program (not this governance-only package).  
3. **`EXECUTIVE_SUMMARY_KPI_IDS`** is operational mirror of Stage 6 eligibility — must stay synchronized with governance approval.  
4. **Governance Layer TypeScript package not created** — intentional (GOV-04 proposal only).  
5. Parent Reporting Constitutions remain Pending adoption.

## Final Verdict

**B. Adopted with observations**

Do not commit. Do not push. Do not deploy.  
Wait for Architecture Authority approval before adoption.
