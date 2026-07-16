# REPORTING-EXPORT-TEMPLATES-ACCEPTANCE-1 — Architecture

**Classification:** Acceptance Remediation  
**Scope:** Presentation layer only (`client/src/lib/reporting-exports/**`)

## Non-goals

This program does **not** modify:

- Reporting Platform / DTOs
- Order Domain / Check Domain
- Runtime / Business Settings
- API contracts / KPI business logic

## Presentation rules

| Concern | Rule |
|---------|------|
| Digits | Western `0–9` only — Excel values written as text (`numFmt: '@'`) |
| Branding | Restaurant logo when available; otherwise MineuQR logo **image** (never plain-text logo) |
| Copy | Customer-facing labels only — no engineering documentation |
| Excel | Executive cover, KPI cards, styled financial tables, print setup |
| PDF | pdfkit + Cairo; Arabic reshape + bidi visual order |

## Source of truth

All KPI values remain verbatim fields from Reporting Platform DTOs already consumed by Dashboard exports.
