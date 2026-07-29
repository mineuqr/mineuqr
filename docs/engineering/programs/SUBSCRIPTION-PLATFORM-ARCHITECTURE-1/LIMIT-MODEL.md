# Limit Model — Deliverable 5

**Program:** SUBSCRIPTION-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Purpose

**Limits** constrain quantitative commercial capacity. They are independent of RBAC permissions and Identity.

```
Feature entitlement → may use capability
Limit               → how much / how many
```

---

## 2. Canonical limit examples

| Limit key | Metric |
|-----------|--------|
| `limit.restaurants` | Restaurants under Tenant |
| `limit.branches` | Branches |
| `limit.users` | Seats / memberships |
| `limit.devices` | Operational devices |
| `limit.orders_per_month` | Order volume |
| `limit.storage` | Storage units |
| `limit.exports` | Export jobs / period |
| `limit.api_requests` | API quota / period |
| `limit.ai_usage` | AI invocations / tokens / period |
| `limit.*` | Future resources via catalog |

Limit keys are stable commercial contracts (same immutability spirit as feature keys).

---

## 3. Limit policies

| Policy | Meaning |
|--------|---------|
| **Unlimited** | No quantitative cap (still feature-gated) |
| **Soft limit** | Exceed allowed with warning / overage signal (billing OOS may react) |
| **Hard limit** | Exceed ⇒ deny further consumption |
| **Grace** | Temporary exceed after soft/hard boundary under time-boxed policy |

Plans bind: `limitKey → { quota | unlimited, policy, period?, grace? }`.

---

## 4. Laws

| Rule ID | Statement |
|---------|-----------|
| **LIM-01** | Limits never grant features — feature entitlement is separate. |
| **LIM-02** | Limits never grant permissions. |
| **LIM-03** | Metering sources are declared (Identity counts, domain counters, AI meters) but **evaluation** is Subscription Platform. |
| **LIM-04** | Domains must not hardcode plan quotas. |
| **LIM-05** | Grace does not create a new Identity or RBAC role. |
| **LIM-06** | AI must respect `limit.ai_usage` when `feature.ai_assistant` is entitled. |
| **LIM-07** | Domains never choose quotas by plan name — limits come from Subscription evaluation (**SP-19**). |
| **LIM-08** | Long-running consumption jobs may snapshot limit allowance at start when historical correctness is required (**SP-18**). |

---

## 5. Evaluation moments

| Moment | Example |
|--------|---------|
| Pre-create | Creating a Branch checks `limit.branches` |
| Pre-invoke | AI tool checks `limit.ai_usage` |
| Periodic | Orders/month rolling window |
| Export | `limit.exports` before job |

Fail closed on hard limit; soft limit may allow with audit event.
