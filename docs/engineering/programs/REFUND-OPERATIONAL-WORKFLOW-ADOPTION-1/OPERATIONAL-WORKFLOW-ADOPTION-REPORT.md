# REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1 — Operational Workflow Adoption Report

| Field | Value |
|---|---|
| **Program** | REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1 |
| **Date** | 2026-07-26 |
| **Verdict** | **PRODUCTION CERTIFIED** |

---

## User flow (Settlement Ledger)

1. Operator opens Settlement History → Settlement Detail  
2. For primary `recordKind=settlement` with paid/complimentary outcome, budget façade loads  
3. When `eligible === true`, Refund action appears  
4. Confirm dialog: refundable balance (domain), amount, tender, optional reason  
5. `checkRefund.applyOnCheck` → `CheckService.applyRefundOnCheck`  
6. Settlement queries invalidate; detail navigates to compensating refund publication when returned  

## Entry conditions

| Condition | Enforcement |
|-----------|-------------|
| Paid / complimentary primary settlement | Presentation visibility |
| Refund budget > 0 | Domain `getCheckRefundBudget` → `eligible` |
| Operator / tenant | `verifiedProcedure` + `assertRestaurantAccess` |
| Register context | `readActiveRegister` → `settlementContextHints` (fail-open) |
| No duplicate / terminal constraints | Domain command outcomes / errors |

## Command reuse

| UI | API | Service |
|----|-----|---------|
| Budget / eligibility | `checkRefund.getBudget` | `getCheckRefundBudget` |
| Confirm refund | `checkRefund.applyOnCheck` | `applyRefundOnCheck` |

---

## Final Certification

**PRODUCTION CERTIFIED**
