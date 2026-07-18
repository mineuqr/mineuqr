# REPORTING-BUSINESS-DAY-BACKFILL-1 — Validation

| Requirement | Result |
|-------------|--------|
| Historical dayKeys rebuilt via canonical Business Day | **Pass** — rebuild path |
| Stale UTC/wall keys removed | **Pass** — delete-before-upsert |
| Full order scan (no 100 clamp) | **Pass** — listOrderIdsForRestaurant |
| Idempotent / restart-safe / tenant-safe | **Pass** — service design + tests |
| Revenue / Tax / Settlement formulas unchanged | **Pass** — guards |
| Reporting APIs / DTOs unchanged | **Pass** |
| Unit + architecture tests | **Pass** (16 in focused suites) |
| `pnpm build` | **Pass** |

## Operator post-run checklist

1. Canary tenant: Order Sales day matches sum of orders on BD key  
2. Month report: no orphan keys under `LIKE 'YYYY-MM%'` for that tenant  
3. Dashboard Order Sales ≈ Excel for same BD range  
4. Check Revenue / Tax unchanged for same filter window (membership may shift only at open boundary)
