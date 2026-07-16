# CHECK-MANAGEMENT-ARCHITECTURE-1 — Implementation

**Status:** Implemented  
**Date:** 2026-07-16  

---

## 1. Modules

| Path | Role |
|------|------|
| `shared/operational-session/check/*` | Contracts, freeze policy, money math, Business Settings helpers |
| `server/operational-session/check/*` | CheckService, repository, mapper |
| `server/operational-session/operationalSessionLifecycle.ts` | `void_check` + active Check accessors |
| `server/diningSession/sessionService.ts` | Create Check on session open; finalize/void on settle/close |
| `server/diningSession/sessionAggregateWriters.ts` | Recalculate open Check on order attach/cancel |
| `server/diningSession/sessionRepository.ts` | `updateSessionActiveCheckId` |
| `drizzle/schema.ts` + `0069_check_management.sql` | Persistence |
| `restaurant.update` | Business tax settings write path |

---

## 2. Persistence

### `operational_checks`

Authoritative Check aggregate rows (own `id`).

### `dining_sessions.activeCheckId`

Session → active Check reference only.

### `restaurants.taxEnabled` / `taxMode` / `taxPolicyJson`

Live Business Settings (not snapshots).

---

## 3. Write paths

```
createSession
  → createOpenCheckForSession (snapshots frozen)
  → dining_sessions.activeCheckId = check.id

increment/decrement session aggregates
  → recalculateOpenCheckForSession (open only; frozen snapshots)

markPaid / markComplimentary
  → settleCheckPaid / settleCheckComplimentary (totals freeze)
  → existing Session settleAndClose

closeSession (manual)
  → voidCheck (best-effort)
  → Session closed without settlementOutcome
```

---

## 4. Certified platforms preserved

| Platform | Touch? |
|----------|--------|
| Order Domain / Lifecycle FSM | No |
| Ordering Platform | No |
| Operational Runtime / Providers / Materializers | No |
| Order Read architecture | No |
| Business Identity | No |
| Operational Screen Platform | No |

---

## 5. Validation commands

See `VALIDATION.md`.
