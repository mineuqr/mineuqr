# CHECK-SETTLEMENT-METHODS-1 — Repository Audit

## Pre-program state

| Area | Finding |
|------|---------|
| Settlement flow | `session.markPaid` / `markComplimentary` / `close` → Check finalize + Session close |
| Lifecycle | open → paid \| complimentary \| voided |
| Payment storage | **None** — state on `operational_checks` only |
| Payment methods | **None** |
| Complimentary | `settleCheckComplimentary` — outcome only |
| DTOs | `OperationalCheck` — no tender fields |
| APIs | restaurantId + sessionId only |
| Reporting | `listTerminalChecksForReporting` → SUM paid grandTotal |
| Ops UI | Dashboard session actions; Waiter does not settle Checks |

## Domain recommendation

**Check → Settlement State + Settlement Transactions**

- Keep Check outcome/grandTotal as SSOT (certified).
- Add child tender lines for methods / split / future gateways.
- Evidence: CHECK-MANAGEMENT non-goals listed tender lines as future; state-only cannot express multi-tender.
