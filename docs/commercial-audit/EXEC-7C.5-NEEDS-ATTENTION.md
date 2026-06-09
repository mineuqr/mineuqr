# EXEC-7C.5 — Needs Attention

**Program:** Commercial Authority Program — Execution  
**Phase:** EXEC-7C.5 — Needs Attention on Commercial Overview  
**Date:** 2026-06-08  
**Status:** Complete  

**Mode:** UI extension only. Same single query. No new authority logic.

**Prerequisites:** EXEC-7C.4 Subscription Health.

---

## 1. Executive Summary

Extended `/admin/commercial` with a **Needs Attention** section showing three canonical attention counts from `snapshot.needsAttention`.

Data source remains:

```typescript
trpc.admin.getCommercialOverview.useQuery()
```

---

## 2. Deliverables

| Card | Snapshot field | Visual tone |
|------|----------------|-------------|
| Expiring Within 30 Days | `needsAttention.expiringWithin30Days` | Warning (amber) |
| Canceled Accounts | `needsAttention.canceledAccounts` | Warning (amber) |
| Expired Accounts | `needsAttention.expiredAccounts` | Critical (red) |

**Component:** `CommercialOverviewNeedsAttention.tsx`

**Page order:** Executive KPIs → Metadata → Subscription Health → Needs Attention

**Not displayed:** `graceAccounts`, `suspendedAccounts` (null / outside authority).

**Zero counts:** Always show `0`.

---

## 3. Architecture

```
admin.getCommercialOverview → snapshot.needsAttention → presentation
```

No additional queries. No client derivation.

---

## 4. Out of Scope

Plan Distribution, Recent Activity, actions, forecasting.

---

*Stop boundary: EXEC-7C.5 complete.*
