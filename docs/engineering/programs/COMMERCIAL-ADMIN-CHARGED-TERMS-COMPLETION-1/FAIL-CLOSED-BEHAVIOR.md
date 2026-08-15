# FAIL-CLOSED BEHAVIOR

Mapped to `TRPCError` `PRECONDITION_FAILED` with message  
`تعذر إكمال الاشتراك: الشروط المالية غير متوفرة.`  
No SQL / driver text is returned.

| Condition | Code |
|-----------|------|
| Invalid / missing billing cycle | invalid_billing_cycle |
| Non-UUID or unknown Live Plan | missing_live_plan |
| Hidden plan | plan_not_selectable |
| Missing / non-positive amount | missing_amount |
| Missing currency | missing_currency |
| DB unavailable or insert error | binding_persist_failed |
| Written row missing required terms | charged_terms_incomplete |
| Existing Binding with different terms | historical_terms_immutable |

Create is not successful unless persist succeeded (or identical-terms retry). Persistence uses compensation, not a SQL transaction — see `TRANSACTION-ATOMICITY.md`.
