# Visual QA Report

## Surfaces audited

ReportsTab · Executive period cards · Empty/skeleton · Period toolbar · Flow strip · Trends · Payment · Sales Source · Orders Details · Refunds · Tax · Exports · Section empty/error

## Fixes applied

| Area | Change |
|------|--------|
| Spacing | `restaurantDash.stack` + consistent section gaps; `scroll-mt-24` for drill targets |
| Period controls | Shared `ReportingPeriodToolbar` (Month + Financial) |
| Radius | `rounded-2xl` on empty/error/shells; selects `rounded-xl` |
| Flow strip | Category-colored values; unified title |
| Charts | Softer grid, axis cleanup, tooltip elevation, `min-w-0` overflow guard |
| Skeletons | `motion-safe:animate-pulse`; slate tokens (not muted mismatch) |
| Icons | Distinct tax icons (Receipt / Scale / CircleDollarSign) |

## Residual observations

- Ultra-wide densifies to the same 3-column executive grid (intentional).
- Sales Source / tax-base placeholders remain intentional “—” until facts publish.
