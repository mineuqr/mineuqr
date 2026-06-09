# EXEC-7C-7 — Commercial Metric Definitions

**Program:** Commercial Overview V1  
**Date:** 2026-06-07  
**Status:** Authoritative reference  
**Authority chain:** Owner Account → Account Subscription (`restaurantId = 0`) → Plan → Entitlements (`resolveCommercialEntitlements`)

This document defines every metric surfaced on `/admin/commercial`. Values are assembled by `CanonicalMetricsService.getCommercialOverviewSnapshot` from `CommercialReadService.getAllOwnerCommercialStates` — **never** from restaurant-scoped subscription rows.

---

## 1. Canonical Model

```text
Owner (users.id)
  └── Account Subscription (user_subscriptions.restaurantId = 0)
        └── Plan (subscription_plans)
              └── Entitlements (resolveCommercialEntitlements)
                    └── Commercial flags (countsInMrr, isEntitled, …)

Restaurant (restaurants)
  └── Operational entity only — NOT a billing or subscription authority unit
```

**Resolver:** `pickUserLevelSubscription(rows)` — account rows only; scoped rows (`restaurantId > 0`) are ignored.

**Metrics source constant:** `CANONICAL_OWNER`  
**Authority source constant:** `S1_CANONICAL`

---

## 2. Revenue Metrics

### MRR (Monthly Recurring Revenue)

| Attribute | Definition |
|-----------|------------|
| **Meaning** | Sum of monthly-equivalent plan prices for owners whose account subscription qualifies for MRR. |
| **Formula** | `Σ monthlyEquivalentPlanPrice(billingCycle, plan.price*)` for each owner where `commercialStatus.countsInMrr === true` and `planId != null`. |
| **Included** | `BASIC`, `PROFESSIONAL`, `ENTERPRISE` — `status === "active"`, period valid (`currentPeriodEnd > now`). |
| **Excluded** | `TRIAL`, `ADMIN`, `NONE`; expired period; `canceled` / `expired` status; admin-role bypass plan. |
| **Billing cycle** | Yearly subs: `priceYearly / 12`; monthly subs: `priceMonthly`. |
| **Currency** | USD (catalog prices). |
| **Restaurant sensitivity** | **No** — restaurant create/delete does not affect MRR. |
| **Subscription sensitivity** | **Yes** — account subscription lifecycle directly affects MRR. |

### ARR (Annual Recurring Revenue)

| Attribute | Definition |
|-----------|------------|
| **Meaning** | Annualized view of canonical MRR. |
| **Formula** | `ARR = round(MRR × 12, 2)` (`arrMethod: "MRR_X12"`). |
| **Restaurant sensitivity** | **No** |
| **Subscription sensitivity** | **Yes** |

---

## 3. Subscriber Metrics

### Commercial Subscribers (Entitled Owners)

| Attribute | Definition |
|-----------|------------|
| **UI label** | Commercial Subscribers |
| **Snapshot field** | `executive.commercialSubscribers` |
| **Meaning** | Count of owner accounts with a non-`NONE` commercial plan (entitled for product features). |
| **Formula** | `count(owners where commercialStatus.isEntitled === true)` i.e. `entitlements.plan !== "NONE"`. |
| **Includes** | Active paid plans, valid trials (`TRIAL`), and **platform `role === "admin"` users** (ADMIN plan bypass). |
| **Excludes** | Owners with only expired/canceled/invalid-period account rows; owners with no account row. |
| **Restaurant sensitivity** | **No** |
| **Subscription sensitivity** | **Yes** |

> **Note:** Admin-role platform users count here (ADMIN plan) but do **not** contribute to MRR (`countsInMrr: false`). See §8 Internal Accounts.

### Active Subscriptions

| Attribute | Definition |
|-----------|------------|
| **Snapshot field** | `executive.activeSubscriptions` (in contract; not shown on Commercial Overview executive cards) |
| **Meaning** | Owners whose authority `subscriptionStatus === "active"`. |
| **Restaurant sensitivity** | **No** |
| **Subscription sensitivity** | **Yes** |

### Active Trials

| Attribute | Definition |
|-----------|------------|
| **Snapshot field** | `executive.activeTrials` (in contract; not shown on executive cards) |
| **Meaning** | Owners whose authority `subscriptionStatus === "trial"` with valid trial period. |
| **Restaurant sensitivity** | **No** |
| **Subscription sensitivity** | **Yes** |

### Trial Account

| Attribute | Definition |
|-----------|------------|
| **Health bucket** | `subscriptionHealth.trial` |
| **Meaning** | Owner account with `subscriptionStatus === "trial"` and period-valid trial entitlement (`planCode === "TRIAL"`). |
| **Restaurant sensitivity** | **No** |
| **Subscription sensitivity** | **Yes** |

### Active Subscriber (Paid)

| Attribute | Definition |
|-----------|------------|
| **Health bucket** | `subscriptionHealth.active` |
| **Meaning** | Owner account with `subscriptionStatus === "active"` and period-valid paid entitlement. |
| **MRR participation** | Subset also has `countsInMrr === true` (paid catalog plans only). |
| **Restaurant sensitivity** | **No** |
| **Subscription sensitivity** | **Yes** |

### Canceled Account

| Attribute | Definition |
|-----------|------------|
| **Health bucket** | `subscriptionHealth.canceled` |
| **Attention bucket** | `needsAttention.canceledAccounts` |
| **Meaning** | Owner account whose account-level row has `status === "canceled"` (authority preserves status even when plan resolves to NONE). |
| **Restaurant sensitivity** | **No** |
| **Subscription sensitivity** | **Yes** |

### Expired Account

| Attribute | Definition |
|-----------|------------|
| **Health bucket** | `subscriptionHealth.expired` |
| **Attention bucket** | `needsAttention.expiredAccounts` |
| **Meaning** | Owner account whose account-level row has `status === "expired"`. |
| **Restaurant sensitivity** | **No** |
| **Subscription sensitivity** | **Yes** |

### Inactive Account

| Attribute | Definition |
|-----------|------------|
| **Health bucket** | `subscriptionHealth.inactive` |
| **Meaning** | Owners where `!isEntitled && planCode === "NONE"` — no current commercial entitlement. |
| **Includes** | Never subscribed; lapsed trial; expired period on active status; scoped-only legacy rows without account row. |
| **Restaurant sensitivity** | **No** (scoped rows alone do not create inactive-with-subscription split-brain in overview) |
| **Subscription sensitivity** | **Yes** |

### Grace Period Account

| Attribute | Definition |
|-----------|------------|
| **Status** | **Not defined in authority** |
| **Snapshot** | `needsAttention.graceAccounts: null` |
| **Meaning** | No post-expiry grace window exists in `resolveCommercialEntitlements`, DB schema, or CRS. |
| **UI** | `CommercialStatusBadge` includes a `grace` variant for presentation elsewhere — **must not** be counted in overview until authority program defines grace. |

### Churned Account

| Attribute | Definition |
|-----------|------------|
| **Operational definition** | Owner who previously had paid entitlement (`countsInMrr`) and now has `planCode === "NONE"` with `status ∈ {canceled, expired}`. |
| **Overview surfacing** | Split across `canceled` + `expired` health buckets; no dedicated churn KPI on overview. |
| **Restaurant sensitivity** | **No** |
| **Subscription sensitivity** | **Yes** |

---

## 4. Attention Metrics

### Expiring Within 30 Days

| Attribute | Definition |
|-----------|------------|
| **Field** | `needsAttention.expiringWithin30Days` |
| **Window** | `needsAttention.windowDays: 30` |
| **Meaning** | Entitled owners (`isEntitled`) with `subscriptionStatus ∈ {active, trial}` whose `currentPeriodEnd` or `trialEndsAt` falls within `[now, now + 30 days]`. |
| **Restaurant sensitivity** | **No** |
| **Subscription sensitivity** | **Yes** |

### Suspended Accounts

| Attribute | Definition |
|-----------|------------|
| **Status** | **Not defined in authority** |
| **Snapshot** | `needsAttention.suspendedAccounts: null` |

---

## 5. Distribution Metrics

### Plan Distribution

| Attribute | Definition |
|-----------|------------|
| **Field** | `planDistribution.entries[]` — `{ planCode, ownerCount }` |
| **Meaning** | One bucket per owner by canonical `planCode` (`NONE`, `TRIAL`, `BASIC`, `PROFESSIONAL`, `ENTERPRISE`, `ADMIN`). |
| **Counting** | Each platform user (`getAllUsers`) appears exactly once. |
| **Restaurant sensitivity** | **No** |
| **Subscription sensitivity** | **Yes** |

---

## 6. Operational Metrics (Non-Revenue)

### Active Restaurants

| Attribute | Definition |
|-----------|------------|
| **Field** | `executive.activeRestaurants` |
| **Source** | `resolveAdminDashboardEntityCounts()` — `COUNT(restaurants WHERE isActive = true)`. |
| **Meaning** | Operational venue count. **Not a commercial authority metric.** |
| **Restaurant sensitivity** | **Yes** — create/delete/activate/deactivate changes count. |
| **Subscription sensitivity** | **No** |

### Total Users

| Attribute | Definition |
|-----------|------------|
| **Field** | `executive.totalUsers` |
| **Source** | `getExtendedAdminStats().totalUsers` |
| **Meaning** | Platform user registry count (all roles). |
| **Restaurant sensitivity** | **No** |
| **Subscription sensitivity** | **No** (user create/delete only) |

---

## 7. Unavailable Metrics (Contract Placeholders)

| Field | Reason |
|-------|--------|
| `recentActivity` | `NO_ADMIN_COMMERCIAL_EVENT_READ_API` |
| `growth` | `NO_CANONICAL_GROWTH_METRIC` |
| `needsAttention.graceAccounts` | No grace authority state |
| `needsAttention.suspendedAccounts` | No suspended authority state |

---

## 8. Internal / Staff Account Handling (Current State)

| Mechanism | Behavior |
|-----------|----------|
| `users.role === "admin"` | `resolveCommercialPlan` returns `ADMIN` plan; `countsInMrr: false`; **still `isEntitled: true`**. |
| `accountType` field | Runtime entitlement classification (`PAYING`, `TRIAL`, `ADMIN`, `NONE`) — **not persisted on `users` table**. |
| Internal flags | **None** in schema. |
| Overview impact | Admin-role users appear in Commercial Subscribers and Plan Distribution (`ADMIN`) but **not** in MRR. |

**Future (ADMIN-AUTH-1):** Requires explicit staff/internal exclusion filter — see EXEC-7C-7 certification §Phase E.

---

## 9. Assumptions

1. **Single account row per owner** is the commercial truth; scoped rows are legacy residue.
2. **Period validity** is evaluated at snapshot `asOf` instant.
3. **All owners** in `users` table are iterated — no sampling.
4. **Plan catalog** prices are authoritative for MRR; no collected-revenue adjustment.
5. **Trials never count in MRR** even when entitled for features.
6. **Restaurant lifecycle** never creates, updates, or deletes account subscription rows (unless explicit subscription mutation).
7. **Grace and suspended** are not modeled — must not be invented in UI counts.

---

## 10. Related Documents

- [EXEC-7C-7-COMMERCIAL-OVERVIEW-CERTIFICATION.md](./EXEC-7C-7-COMMERCIAL-OVERVIEW-CERTIFICATION.md) — audit, regression matrix, certification
- [EXEC-7C.1-COMMERCIAL-OVERVIEW-DATA-CONTRACT.md](./EXEC-7C.1-COMMERCIAL-OVERVIEW-DATA-CONTRACT.md) — snapshot schema
- [AUTHORITY-CLEANUP-1-SUBSCRIPTION-AUTHORITY-UNIFICATION.md](./AUTHORITY-CLEANUP-1-SUBSCRIPTION-AUTHORITY-UNIFICATION.md) — authority unification
