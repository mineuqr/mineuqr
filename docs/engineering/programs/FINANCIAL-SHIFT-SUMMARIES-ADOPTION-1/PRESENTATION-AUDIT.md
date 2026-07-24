# FINANCIAL-SHIFT-SUMMARIES-ADOPTION-1 — Presentation Audit (Phase 1)

## Visible financial numbers (pre-adoption)

| UI binding | Source | Classification | Ambiguity |
|------------|--------|----------------|-----------|
| Opening float | `openingFloatAmount` | Cash Drawer | OK |
| Middle amount under “الوردية الحالية” | `expectedCashAmount` | Cash Drawer (Expected Cash) | **High** — read as Total Sales |
| Section “ملخص النقدية الحالية” | custody summary | Cash Drawer | Medium — sounds like all cash activity |
| Cash count expected/actual/diff | drawer close | Cash Drawer | OK |
| Tender mix | *(absent)* | Settlement / Reporting | Missing operational visibility |

## Target separation

1. **درج النقد** — Expected Cash + float + count/diff only  
2. **ملخص وسائل الدفع** — tender mix from attributed Settlement Records (certified analytics rules)
