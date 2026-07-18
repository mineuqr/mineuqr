# CHECK-SETTLEMENT-METHODS-1 — Implementation Report

## 1. Repository investigation

See [AUDIT.md](./AUDIT.md).

## 2. Settlement architecture review

See [ARCHITECTURE.md](./ARCHITECTURE.md).

Decision: **Check aggregate + settlement transactions** (not a separate Settlement aggregate).

## 3. Payment Method model

`shared/operational-session/check/paymentMethod.ts`

Built-ins: cash, mada, visa, mastercard, apple_pay, stc_pay, bank_transfer, complimentary, other.

## 4. Settlement Transaction model

- Contracts: `settlementTransactionContract.ts`
- Invariants: `settlementInvariants.ts`
- Table: `check_settlement_transactions` (`0070_check_settlement_transactions`)
- Repository: `settlementTransactionRepository.ts`

## 5. Split Payment architecture

- Atomic multi-tender on `settleCheckPaid({ settlements })` with sum = grandTotal
- Default path (no settlements): single `other` line — **Dashboard unchanged**
- Partial open-Check settle: helper only; not wired to product APIs

## 6. Reporting integration assessment

| Item | Status |
|------|--------|
| Revenue / Tax / Paid Checks | Unchanged |
| Reporting APIs | Unchanged (no new router procedures) |
| Read adapter | `settlementTransactionReportingAdapter.ts` |
| Future DTO | `SettlementDistributionDto` (types only) |

## 7. Operational adoption audit

| Consumer | Compatibility | Migration |
|----------|---------------|-----------|
| Dashboard markPaid / complimentary | Compatible — default tender written | Optional future tender picker |
| Excel / PDF / Reports KPIs | Compatible — no label/API change required | Future method sheets optional |
| Waiter checkout | N/A (orders only) | None |
| Future POS | Use `settleCheckPaid` + `settlements[]` | Documented |

## 8. Files modified / added

**Added:** payment/settlement shared modules, repository, reporting adapter, migration `0070`, tests, docs.

**Modified:** `CheckService.ts`, `drizzle/schema.ts`, journal + governance tail, CHECK-MANAGEMENT ARCHITECTURE non-goals pointer, reportingContracts + index exports.

## 9. Validation results

See [VALIDATION.md](./VALIDATION.md).

## 10. Risks

1. Historical paid Checks (pre-migration) have **no** tender rows — analytics by method incomplete until backfill policy (optional; not in scope).
2. Default method `other` is a semantic bucket for unspecified tender — product may later require explicit cash/card UI.
3. Finalize then insert transactions is not one DB transaction with Session close today (pre-existing Check/Session split) — failure after finalize would leave Check paid without tenders (mitigate later with shared transaction).

## 11. Architectural gaps

1. No Dashboard tender picker (intentional — validation: Dashboard unchanged).
2. No reporting.* procedure for distribution yet.
3. No backfill of tenders for legacy paid Checks.
4. Partial settle / refunds reserved in status enum only.

## 12. Recommendations

1. Product program for tender picker on markPaid.
2. Mount `reporting.getSettlementDistribution` when analytics UI is ready.
3. Optional one-time backfill: insert `other` = grandTotal for paid Checks missing rows.
4. Unify Check finalize + tender insert + Session close in one DB transaction in a hardening program.

## 13. Final status

**Ready for independent architecture review.**

No blocking issue for architecture certification. Product UI for methods is an adoption follow-up, not an architecture blocker.
