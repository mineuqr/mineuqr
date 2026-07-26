# REFUND-OPERATIONAL-WORKFLOW-ADOPTION-2 — Refund Workflow Report

| Field | Value |
|---|---|
| **Program** | REFUND-OPERATIONAL-WORKFLOW-ADOPTION-2 |
| **Date** | 2026-07-26 |
| **Verdict** | **PRODUCTION CERTIFIED** |

---

## Canonical entry

| Item | Adoption |
|------|----------|
| Entry point | Settlement Ledger toolbar **مرتجع** only |
| Detail **استرداد** | Removed (component deleted; Detail has no apply hooks) |
| Duplicate write paths | None |

---

## Workflow steps

| Step | Behavior | Evidence |
|------|----------|----------|
| 1. Settlement Number | Manual entry in `SettlementLedgerRefundDialog`; `parseSettlementOperationalIdentity` | Dialog + shared identity |
| 2. Lookup / validate | `checkRefund.lookupBySettlementNumber` → exists, paid, eligible, budget, window, policy | `checkRefundLookupService.ts` |
| 3. Summary | Number, check, business day, settledAt, method, original / prior refund / balance | Dialog summary rows |
| 4. Options | Full / Partial (if policy), amount, reason, manager approval checkbox when required | Dialog + policy flags |
| 5. Actions | Save · Save & Print · Cancel; Save hidden when window expired | Dialog footer |
| Post-save | `applyOnCheck` → immutable compensating SR; ledger invalidate; optional receipt / detail open | Panel callbacks + existing domain |

---

## Validation matrix

| Case | Result |
|------|--------|
| Lookup by settlement number | Supported (`ST-…` / digits) |
| Valid refund | Apply via CheckService when eligible + in window |
| Expired (>24h default) | `REFUND_WINDOW_EXPIRED`; UX title + hide Save |
| Unknown settlement | `NOT_FOUND` / `unknown_settlement` |
| Already refunded / no budget | `NOT_ELIGIBLE` / domain budget errors |
| Full / partial | UI modes; partial gated by policy |
| Ledger publication | Unchanged append-only refund SR in history |
| Receipt printing | Save & Print → `SettlementReceiptDialog` |
| Reporting / Register | Unchanged consumers of refund SR |
| Settlement immutable | Original SR never updated |

---

## Final Certification

**PRODUCTION CERTIFIED**
