# REPORTING-BUSINESS-DAY-ADOPTION-1 — Validation

| Requirement | Result |
|-------------|--------|
| KPIs use Business Day bounds / keys | **Pass** — services, calendar, comparison |
| Report scopes (today / month / year / comparison) use BD | **Pass** |
| No duplicate BD logic | **Pass** — `shared/utils/businessDay.ts` |
| Revenue / Tax / Settlement formulas unchanged | **Pass** |
| Sessions today not naive midnight | **Pass** — architecture guard |
| Order Sales not UTC slice | **Pass** — architecture guard |
| Reports not `getUTC*` default | **Pass** — architecture guard |
| Comparison baselines use BD open→open | **Pass** — updated tests |
| Backfill dayKey uses restaurant hours | **Pass** |
| Dashboard / Excel / PDF same ranges | **Pass** — shared `periodRange` + DTOs |
| Tenant isolation | **Pass** — unchanged access checks |
| Business Identity preserved | **Pass** — hours via Identity resolver |
| Reporting suite tests | **Pass** — 115 tests |
| `pnpm build` | **Pass** |
