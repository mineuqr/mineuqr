# REGISTER-CATALOG-VALIDATION-PRESENTATION-1 — Presentation Audit

| Field | Value |
|---|---|
| **Program** | REGISTER-CATALOG-VALIDATION-PRESENTATION-1 |
| **Date** | 2026-07-25 |
| **Scope** | Register Catalog UI only |

## Findings (pre-fix)

| Location | Issue |
|----------|-------|
| `RegisterCatalogPanel.submitForm` catch | `e.message` / `String(e)` — raw TRPC/Zod text |
| Form error `<p role="alert">` | Single global dump; no field attachment |
| List query `isError` | Renders `listQuery.error.message` raw |
| Inputs / select | No `aria-invalid`, no helper text, no red border |
| Lifecycle mutations | Unhandled rejections; no user-facing map |
| Success path | No toast |

## Non-goals

- Domain / API / DB changes
- Duplicating server validation rules in the UI
