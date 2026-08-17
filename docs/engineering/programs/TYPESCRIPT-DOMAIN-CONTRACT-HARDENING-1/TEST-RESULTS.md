# TEST RESULTS

**Program:** TYPESCRIPT-DOMAIN-CONTRACT-HARDENING-1

## pnpm check

| | Forensic start | After FIX_NOW |
|--|----------------|---------------|
| Count | **178** | **148** |
| Exit | 2 | 2 |
| App.tsx | 0 | 0 |
| Raw | `pnpm-check.raw.txt` | `pnpm-check.after.raw.txt` |

| Gate | Value |
|------|--------|
| BEFORE | 178 |
| AFTER | 148 |
| DELTA | −30 |
| NEW | 0 |
| REMOVED | 30 |
| CHANGED | 0 |
| UNCLASSIFIED | 0 |

## pnpm build

**PASS**

## Focused tests

```
pnpm test
  shared/operational-session/__tests__/settlementPaymentMethodCapture.architecture.guards.test.ts
  shared/operational-session/__tests__/checkSettlementMethods.architecture.guards.test.ts
  client/src/lib/operational-workspace/__tests__/orderDisplayIdentity.test.ts
  server/operational-session/check/__tests__/checkSplitPaymentIntegration.test.ts
  server/operational-session/check/__tests__/checkMembershipService.test.ts
  server/order/application/__tests__/IdentityPlaceOrderService.test.ts
  server/operational-device/__tests__/screenCredentialGovernance.test.ts
  server/operational-device/__tests__/screenCredentialLifecycle.test.ts
```

| File | Tests | Passed | Failed | Skipped |
|------|------:|-------:|-------:|--------:|
| settlementPaymentMethodCapture.architecture.guards | 5 | 5 | 0 | 0 |
| checkSettlementMethods.architecture.guards | 6 | 6 | 0 | 0 |
| orderDisplayIdentity.test | 5 | 5 | 0 | 0 |
| checkSplitPaymentIntegration.test | 9 | 9 | 0 | 0 |
| checkMembershipService.test | 6 | 6 | 0 | 0 |
| IdentityPlaceOrderService.test | 2 | 2 | 0 | 0 |
| screenCredentialGovernance.test | 9 | 9 | 0 | 0 |
| screenCredentialLifecycle.test | 7 | 7 | 0 | 0 |
| **Total (final focused set)** | **49** | **49** | **0** | **0** |

`displayIdentityRollout.architecture.guards.test.ts` has a pre-existing failure on `OperationalCard.tsx` (`presentation.identity.displayReference`). This program did not modify that file. Not used as a pass gate.

## Architecture guards

Settlement payment-method catalog guards PASS (selectable remains `cash`, `card`).

## Production / database

| Field | Value |
|-------|--------|
| Production mutation | 0 |
| Database mutation | 0 |
| Deployment | 0 |
| Migration | 0 |
