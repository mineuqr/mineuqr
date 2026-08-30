# FINAL REPORT — REALTIME-ARCHITECTURE-REGRESSION-GUARD-1

**Status:** GUARDS LANDED  
**Baseline commit (pre-guard):** `f30be706`  
**Scope:** Architecture + behavioral regression guards only. No Realtime redesign.

## Purpose

Permanently protect the certified Realtime architecture:

```
Domain → Outbox → Projection → Metadata Hint → Shared TiDB Bus → SSE
  → Client invalidate → Authoritative refetch
```

Realtime remains **notification / synchronization**, never source of truth.

## Guard coverage (G01–G20+)

| ID | Contract | Guard type |
|----|----------|------------|
| G01/G20 | Production shared bus via `createRealtimePubSub` / `DatabaseRealtimePubSub` | architecture |
| G02 | Browser Order Realtime = SSE / EventSource | architecture |
| G03 | Metadata-only hints | architecture |
| G04 | Hints after projection rematerialize | architecture |
| G05–G12 | No Order/Invoice/CF/PAID/Settlement/Drawer/Refund/Recovery writers | architecture |
| G13/G34 | Client invalidate/refetch — no `setQueryData` fabricate | architecture |
| G14–G16 | Server ACL, customer aggregate scope, durable revocation | architecture |
| G17 | Bus publish fail-open | architecture |
| G18–G19 | Connector WS + BroadcastChannel isolation | architecture |
| G22 | Migrations 0102 + 0103 intact | architecture |
| G35–G38 | Kitchen invalidate + served excluded + structural sharing | architecture |
| G39–G41 | Seq dedup / stale / gap | behavior |
| G57–G59 | lastEventId, catch_up, backoff, poll_only | architecture |

## Test entry points

- `server/realtime-platform/__tests__/realtimeArchitectureRegression.guards.test.ts`
- `shared/realtime-platform/__tests__/realtimeSequenceRegression.test.ts`
- `client/src/lib/realtime-platform/__tests__/realtimeClientConvergence.architecture.guards.test.ts`

Prior suites retained: foundation, multi-instance fan-out, shared revocation, kitchen/orders adoption, read-freshness Kitchen merge.

## Explicit non-claims

- Guards do **not** re-certify Production live Kitchen browser delivery.
- `/api/realtime/health = 200` proves liveness/sharedBus status only.
- InMemoryRealtimePubSub remains legitimate for unit tests; must not be Production shared-fan-out authority.

## Constraints respected

- No new transports
- No new Realtime business publishers
- No secrets in tests
- No temporary `_*.mjs` harness committed
