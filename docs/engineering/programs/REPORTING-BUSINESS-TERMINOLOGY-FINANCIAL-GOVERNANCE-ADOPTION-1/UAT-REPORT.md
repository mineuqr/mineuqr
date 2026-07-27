# UAT Report

## Automated

| Suite | Result |
|-------|--------|
| Product Semantics guards | **PASS** |
| Exec / exports / Final UAT reconciliation | **PASS** |
| Acceptance Excel samples | **PASS** |
| Dashboard order KPI presentation guards (updated) | **PASS** |
| KPI governance | **PASS** |

Final UAT asserts Excel blob contains **Total Sales** and does **not** contain Gross Sales / Check Revenue.

## Live DB (restaurant `720007`, July 2026)

| Check | Result |
|-------|--------|
| sourceMode `settlement_record` | PASS |
| Non-zero KPIs reconciled Dashboard VM ↔ Excel | PASS |
| Labels Total Sales / Net Sales / Refund Amount present | PASS |
| Deprecated Gross Sales / Check Revenue absent from Excel blob | PASS (via updated live script checks + Final UAT) |

## Residual

Interactive browser click-through not re-run in this session; presentation labels are Product Semantics–driven (same path as Excel).

**UAT status:** PASS for presentation terminology adoption.
