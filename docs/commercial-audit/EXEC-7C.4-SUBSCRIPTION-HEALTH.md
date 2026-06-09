# EXEC-7C.4 — Subscription Health

**Program:** Commercial Authority Program — Execution  
**Phase:** EXEC-7C.4 — Subscription Health on Commercial Overview  
**Date:** 2026-06-08  
**Status:** Complete  

**Mode:** UI extension only. Same single query. No new authority logic.

**Prerequisites:** EXEC-7C.3 Commercial Overview UI Foundation.

---

## 1. Executive Summary

Extended `/admin/commercial` with a **Subscription Health** section showing five authority-backed status counts from `snapshot.subscriptionHealth`.

Data source remains:

```typescript
trpc.admin.getCommercialOverview.useQuery()
```

No additional endpoints. No client-side count derivation.

---

## 2. Deliverables

| Card | Snapshot field | Visual tone |
|------|----------------|-------------|
| Active | `subscriptionHealth.active` | Positive (green) |
| Trial | `subscriptionHealth.trial` | Informational (blue) |
| Canceled | `subscriptionHealth.canceled` | Warning (amber) |
| Expired | `subscriptionHealth.expired` | Critical (red) |
| Inactive | `subscriptionHealth.inactive` | Neutral (muted) |

**Component:** `CommercialOverviewSubscriptionHealth.tsx`

**Page order:** Executive KPIs → Snapshot Metadata → Subscription Health

**Zero counts:** Always display `0` — cards are never hidden.

**Forbidden:** grace, suspended (not in authority).

---

## 3. Architecture

Unchanged single-read path:

```
admin.getCommercialOverview → CommercialOverviewSnapshot.subscriptionHealth → presentation
```

---

## 4. Out of Scope

Needs Attention, Plan Distribution, Recent Activity, charts, growth, actions.

---

*Stop boundary: EXEC-7C.4 complete.*
