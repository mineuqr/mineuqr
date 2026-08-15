# TEST-PLAN.md

Deterministic clock: `NOW` fixtures. No wall-clock sleeps.

## Automated

| Area | File |
|------|------|
| Derive matrix | `server/subscription-runtime/__tests__/commercialAccountState.test.ts` |
| Paid / trial / renewal stamps | `subscriptionRuntimeEntitlement.enforcement.test.ts` |
| API denylist + assert | `server/commercial/__tests__/assertCommercialAccountActive.test.ts` |
| Login / route helper | `client/src/lib/commercial/__tests__/commercialAccountState.test.ts` |
| Public QR | `server/ordering-platform/__tests__/qrOrderingFrozen.behavior.test.ts` |
| Owner exempt | `platformOwnerAccess.hub.test.ts` |
| Client gate | `orderingClientRuntime.test.ts` |
| Architecture guards | `commercialFrozenAccountState.guards.test.ts` |

## Required matrix coverage

1–5 Account state: paid active/expired, trial active/expired, expired trial + paid  
6–8 Login / Dashboard navigation  
9–12 API denylist  
13–16 Public QR identity + frozen + restore  
17–22 Renewal preserves identity (derived; no deletes)  
23–25 Owner FULL_PLATFORM / SIMULATED_PLAN  
26–34 Regression suites listed in REGRESSION-VALIDATION.md
