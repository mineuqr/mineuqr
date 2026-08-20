# VALIDATION-REPORT

Executed locally. No production writes. No 0098. Not deployed.

## New tests

| File | Coverage |
|---|---|
| `cashierDownstreamSettlementRecovery.test.ts` | pending obligation, same CF identity, skip ST, skip OS, ST from CF tenders, attention/completed states |
| `cashierDownstreamSettlementRecoveryWorker.test.ts` | crash resume sweep, no CF write, concurrent in-flight, transient retry |
| `cashierDownstreamSettlementRecovery.architecture.guards.test.ts` | HTTP not blocked, insert-only CF, no 0098, other channels, Union, POS replay |
| `posSettlementInitiate.order.test.ts` | idempotency replay schedules recovery without extra settle |

## Executed evidence (vitest 2.1.9)

| Batch | Files | Tests | Failed | Skipped |
|---|---:|---:|---:|---:|
| Recovery + decoupling + POS + Confirm + migration + Union guards | 11 | 100 | 0 | 0 |
| CF contract/writer/execution + adoption + Session + refund + Check ST/OS/SR + HTTP-at-commit | 15 | 155 | 0 | 0 |
| **Total unique** | **26** | **255** | **0** | **0** |

Existing decoupling / HTTP-at-commit / CF adoption guards were not weakened.
