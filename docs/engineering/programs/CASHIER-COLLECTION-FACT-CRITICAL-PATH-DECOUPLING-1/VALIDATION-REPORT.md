# VALIDATION-REPORT

Program: **CASHIER-COLLECTION-FACT-CRITICAL-PATH-DECOUPLING-1**

Executed locally. No production writes. No 0098. Not deployed.

## New tests

| File | Coverage |
|---|---|
| `CheckService.cashierCollectionFactCriticalPathDecoupling.test.ts` | HTTP after CF with hanging ST; ST/OS/SR failure after commit; downstream retry without second CF; concurrent Confirm; CF throw fails HTTP |
| `cashierCollectionFactCriticalPathDecoupling.architecture.guards.test.ts` | Cashier does not await ST/OS/SR; Session/Waiter/Kiosk/QR unchanged; Check OPEN is not an HTTP failure; insert-only CF; no payments table / no 0098; Union overlap unchanged |
| `PaymentConfirmService.test.ts` | Defer flag; OPEN Check still logs PAID after CF; replay; CF storage failure |
| `posSettlementInitiate.order.test.ts` | HTTP `outcome: "paid"` when settle returns OPEN Check and null SR |

## Executed evidence (vitest 2.1.9)

Three batches, **no overlapping files**, all green:

| Batch | Files | Tests | Failed | Skipped |
|---|---:|---:|---:|---:|
| Decoupling + POS + Confirm + trim + m4 | 11 | 88 | 0 | 0 |
| CF contract/writer/execution + Union + metrics + refund + migration | 21 | 173 | 0 | 0 |
| Check ST/OS/SR + Session + Cashier UI + remaining Confirm guards | 16 | 117 | 0 | 0 |
| **Total unique** | **48** | **378** | **0** | **0** |

Guards **not weakened**. PAYMENT-CONFIRM-CRITICAL-PATH-TRIM-1 still requires ST/OS/SR **source** in `finalizeOpenCheckById` (Session + Cashier downstream). HTTP-at-commit still requires Session to await Attribution. CF adoption still requires Confirm to call the adapter.

## Production

No production writes. Migration tail remains **0097**. Not deployed.
