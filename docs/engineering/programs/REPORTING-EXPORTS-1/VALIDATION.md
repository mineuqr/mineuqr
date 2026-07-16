# REPORTING-EXPORTS-1 — Validation

**Date:** 2026-07-16  
**Decision:** **PRODUCTION CERTIFIED**

---

## Commands

```bash
pnpm exec vitest run client/src/lib/reporting-exports
pnpm db:governance-check
pnpm build
```

---

## Results

| Gate | Result |
|------|--------|
| Unit + architecture guards | **7 passed** |
| Migration governance | **PASS** — terminus `0069_check_management` (no new migrations) |
| `pnpm build` | **PASS** |

---

## Acceptance criteria

| Criterion | Status |
|-----------|--------|
| Excel consumes `reporting.*` only | **PASS** |
| PDF consumes `reporting.*` only | **PASS** |
| No business calculations in exports | **PASS** — no `.reduce`, no local Revenue |
| Dashboard / Excel / PDF identical KPI sources | **PASS** — shared DTO fields |
| Revenue from Paid Check via Reporting | **PASS** |
| Tax / Currency from Check snapshots | **PASS** |
| No Runtime / Order / Check / Reporting Platform redesign / DB changes | **PASS** |

---

## Final certification

**REPORTING-EXPORTS-1 — PRODUCTION CERTIFIED**

Excel and PDF are presentation renderers over Reporting Platform DTOs. Reporting Platform remains the single source of Dashboard and export KPIs.
