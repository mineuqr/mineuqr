# FINAL REPORT

**Program:** COMMERCIAL-CHARGED-TERMS-SNAPSHOT-RUNTIME-PRODUCTION-DEPLOY-1  
**Date:** 2026-08-15  
**STATUS:** CERTIFIED

## Git baseline

```
HEAD e936e654 test(commercial): align live plan identity guard
Working tree: authorized Charged Terms snapshot runtime (not discarded)
```

Unrelated Production changes: none. JSON dumps excluded from commit.

## Commit / push / deploy

| Field | Value |
|-------|--------|
| Committed SHA | `56ce4bc2416ed77c98077978a15373c742aa857c` |
| Pushed SHA | `56ce4bc2416ed77c98077978a15373c742aa857c` |
| Remote | `origin main` |
| Deployment ID | `5923152367` |
| Deployment timestamp | `2026-08-15T18:00:52Z` |
| Status | success |
| Production URL | `https://www.mineuqr.com` |

## Production journal / data

| Item | Value |
|------|--------|
| `DATABASE()` | mineuqr |
| Journal | 0089 hash `45dd198fe62f78746ef245e5091fc146ee383235f6d5a01b5d2b590b06c37e6d` |
| Snapshot table | present |
| Snapshot rows before deploy | 0 |
| Snapshot rows after deploy | 0 |
| Subscriptions | 7 unchanged |
| Bindings | 3 unchanged (19.00 / 19.00 / 29.00 USD monthly leftover) |
| 780001 | unchanged: active, yearly, unbound, `d836bd10-9d9f-4408-a076-f921354d785a` |
| Historical backfill | none |
| Production data mutation | none |
| Migration action | none |

## Tests / build / check

| Gate | Result |
|------|--------|
| Targeted snapshot architecture suite | **92 passed** |
| `pnpm build` | exit 0 |
| `pnpm check` | exit 2 — preexisting ~186–188 `error TS*` (kiosk/retention/reporting/MapIterator). **Zero** new diagnostics in snapshot runtime files |

Guards were not weakened. Tests were not deleted.

## Production smoke

Application started. Public catalog loaded Live Plan UUIDs. USD catalog prices matched `commercial_prices`. Existing subscription identities unchanged. Entitlement authority remains subscription-runtime. MRR/ARR procedures load (401 without session, not 500). Admin subscription page and `/pricing` load. No payment. No test subscription.

## Architecture guarantee (deployed)

```
Live Plan / commercial_prices     = CURRENT PRICE AUTHORITY
Charged Terms Snapshot           = HISTORICAL COMMITMENT AUTHORITY
MRR                              = SUM(current immutable Charged Terms snapshots)
ARR                              = MRR × 12
```

No second price authority. Binding leftover is not MRR fallback. `subscription_plans` / `legacyPlanId` / LEGACY_PLAN_BRIDGE are not historical price authority.

## Out of scope (not started)

OD-4. SAFE DELETE. Complimentary periods. Checkout redesign. Webhook integer retirement. 0090. Backfill of 780001 or any existing subscription.
