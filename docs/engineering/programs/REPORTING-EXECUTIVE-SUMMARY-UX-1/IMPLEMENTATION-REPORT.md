# REPORTING-EXECUTIVE-SUMMARY-UX-1 — Implementation Report

## 1. UX investigation

**Question the Executive Summary answers:**  
“How did the restaurant perform this period?”

**Prior pain:** Six correct KPIs were shown in a flat grid. Owners saw two large money numbers (Check Revenue vs Order Sales) without knowing why both exist. Captions and grouping were missing.

## 2. Executive persona analysis

| Persona | Role | Priority |
|---------|------|----------|
| **Restaurant Owner** | Needs instant performance read | **Primary** |
| Restaurant Manager | Same snapshot + ops follow-up | Secondary |
| Branch Supervisor | Same | Secondary |
| Accountant | Needs Tax / Adjustments / Basis | **Not primary** → Financial Summary |

## 3. KPI usability review

| KPI | Usability | Notes |
|-----|-----------|-------|
| Check Revenue | Needs clarification | Correct term; needs plain caption + grouping |
| Order Sales | Needs clarification | Same — pair with Check Revenue visually |
| Paid Checks | Clear | Volume of paid checks |
| Orders | Clear | Volume of orders |
| Average Check | Clear with caption | Pair under collected |
| Average Order | Clear with caption | Pair under served |

None removed (RATIONALIZATION already removed Tax / Complimentary / Voided).

## 4. Check Revenue usability analysis

| Cause | Assessment |
|-------|------------|
| Terminology | Correct (Product Semantics) — **keep** |
| Placement | Flat grid next to Order Sales amplified confusion |
| Visual hierarchy | No “collected vs served” story |
| Supporting explanation | Hint was generic |
| Duplication with Order Sales | Not duplication — two domains; UX must explain difference |

**Conclusion:** Do **not** remove Check Revenue. Fix hierarchy + captions + comparison note.

## 5. UX alternatives considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| A. Rename Check Revenue → “Sales” | Familiar | Violates Product Semantics / ownership | Rejected |
| B. Remove Check Revenue from Executive | Simpler | Hides certified money SSOT | Rejected |
| C. Group collected vs served + captions + comparison note | Owner-readable; keeps semantics | Slightly taller page | **Accepted** |
| D. Single money KPI only | Lowest cognitive load | Loses Order Sales story | Rejected |

## 6. Final design decision

**Alternative C:**

1. Lead with primary question.  
2. Group **Money collected** → Check Revenue, Paid Checks, Average Check.  
3. Group **Orders served** → Order Sales, Orders, Average Order.  
4. Plain-language **caption** under each card (not a KPI rename).  
5. Footer **comparison note** (why the two money totals differ) + averagePair clarification from Product Semantics.

KPI names still from `preferredKpiLabel`. No Product Semantics / Platform edits.

## 7. Files modified

- `client/src/lib/reporting-exports/executiveSummaryPresentation.ts`
- `client/src/lib/reporting-exports/excel/buildReportingExportWorkbook.ts`
- `client/src/lib/reporting-exports/pdf/buildReportingExportPdf.ts`
- `client/src/lib/reporting-exports/__tests__/reportingExecutiveSummary.architecture.guards.test.ts`
- `docs/engineering/programs/REPORTING-EXECUTIVE-SUMMARY-UX-1/*`

## 8. Validation

See [VALIDATION.md](./VALIDATION.md).

## 9. Risks

1. Page height increases (two group headers + captions) — acceptable for landscape Excel.  
2. Arabic captions are presentation UX copy; keep aligned with Product Semantics names.

## 10. Recommendations

1. Optionally mirror the same two-group pattern on Dashboard Revenue / Order Sales sections later.  
2. Do not put Tax back on Executive.

## 11. Final status

**Ready for independent architecture review.**
