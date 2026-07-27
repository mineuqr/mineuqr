# Architecture Compliance Report

| Protected surface | Status |
|-------------------|--------|
| Business / financial laws | Untouched |
| Reporting Platform / Services / APIs / DTOs / Read Models | Untouched |
| Schema / DB / Runtime / Ownership | Untouched |
| KPI formulas / definitions | Untouched |
| ADR / Constitutions / Governance | Untouched |

## Presentation-only changes

- Excel header toolbar relocation  
- Sales Source honesty + bind-ready VM (`facts` prop)  
- Tax placeholder cleanup  

## Source of truth

Sales Source accepts **only** injected reporting facts. ReportsTab passes `facts={null}` until a platform contract exists — **no mocks, no UI totals, no fallback invention**.

## Final Verdict

**C. Root cause identified but blocked**
