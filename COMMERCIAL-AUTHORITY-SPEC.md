# COMMERCIAL-AUTHORITY-SPEC.md

**PG-1C.1A — Commercial Authority Spec**  
**Status:** APPROVED TARGET SPECIFICATION  
**Priority:** P0  
**Purpose:** Define the single commercial authority model that MineuQR will use before commercial launch.

This document supersedes historical commercial behavior, legacy subscription scope patterns, hardcoded plan checks, and distributed entitlement decisions.

---

## 1. Commercial Philosophy

MineuQR is an **Owner-Centric SaaS Platform**.

Commercial hierarchy:

```
Owner Account
    ↓
Subscription
    ↓
Plan
    ↓
Entitlements
    ↓
Restaurants
```

Restaurants never own subscriptions.

Restaurants inherit commercial rights from the owner account.

---

## 2. Commercial Authority Principle

All commercial decisions must originate from a single authority layer.

**Approved authority:** `resolveCommercialEntitlements()`

No feature may implement independent commercial logic.

**Forbidden:**

- Hardcoded plan IDs
- Feature-specific entitlement implementations
- Restaurant-scoped commercial authority
- Multiple entitlement sources

---

## 3. Account Types

```
AccountType:
  ADMIN
  TRIAL
  PAYING
  NONE
```

| Type | Definition |
|---|---|
| **ADMIN** | Operational account only |
| **TRIAL** | Professional trial access |
| **PAYING** | Commercial subscriber |
| **NONE** | No active commercial access |

---

## 4. Subscription Model

**Rule:**

```
One Owner
    ↓
One Active Commercial Subscription
```

**Allowed:**

- One Trial Subscription **OR**
- One Active Paid Subscription

**Forbidden:**

- Multiple active paid subscriptions
- Multiple concurrent trials
- Commercial entitlement stacking

---

## 5. Plan Model

**Supported plans:** `BASIC` | `PROFESSIONAL` | `ENTERPRISE`

Plans are business definitions.

Plan IDs are implementation details only.

Commercial logic must never depend on numeric IDs.

---

## 6. Basic Plan

**Purpose:** Single-location QR menu plan.

**Limits:** Restaurants: 1

| Feature | Enabled |
|---|---|
| QR Menu | Yes |
| Ordering | No |
| Cart | No |
| Checkout | No |
| Call Waiter | No |
| Request Bill | No |
| Reports | No |
| Templates | Yes |
| Custom Colors | No |
| Custom Fonts | No |
| Revenue Participation | Yes |
| Invoice Eligible | Yes |

---

## 7. Professional Plan

**Purpose:** Full restaurant operation plan.

**Limits:** Restaurants: 5

| Feature | Enabled |
|---|---|
| QR Menu | Yes |
| Ordering | Yes |
| Cart | Yes |
| Checkout | Yes |
| Call Waiter | Yes |
| Request Bill | Yes |
| Reports | Yes |
| Templates | Yes |
| Custom Colors | Yes |
| Custom Fonts | Yes |
| Revenue Participation | Yes |
| Invoice Eligible | Yes |

---

## 8. Enterprise Plan

**Purpose:** Multi-location business plan.

**Limits:** Restaurants: Unlimited

**Features:** All Professional features

| Flag | Value |
|---|---|
| Revenue Participation | Yes |
| Invoice Eligible | Yes |

---

## 9. Trial Model

Trial is **not** a plan.

**Trial definition:**

- Plan = `PROFESSIONAL`
- Status = `TRIAL`
- Duration = 14 days

| Rule | Value |
|---|---|
| Counts As Revenue | No |
| Counts As MRR | No |
| Invoice Eligible | No |
| Subscriber Count | No |
| Commercial Reporting | No |

Trial receives Professional feature access.

---

## 10. Admin Model

Admin is **not** a commercial customer.

| Rule | Value |
|---|---|
| Unlimited Restaurant Access | Yes |
| Unlimited Feature Access | Yes |
| Revenue Participation | No |
| MRR Participation | No |
| Subscriber Participation | No |
| Trial Participation | No |
| Invoice Participation | No |

Admin exists outside commercial analytics.

---

## 11. Entitlement Model

Official commercial authority output:

- Account Type
- Plan
- Subscription Status
- Limits
- Features
- Commercial Flags

**Example shape:**

```
accountType
plan
status
limits
features
commercial
```

No consumer should query subscription tables directly to determine commercial rights.

---

## 12. Feature Authority

Feature access must be determined exclusively through entitlement output.

| Feature | Authority path |
|---|---|
| Ordering | `features.ordering` |
| Call Waiter | `features.callWaiter` |
| Request Bill | `features.requestBill` |
| Reports | `features.reports` |

**Never:**

```typescript
if (planId === ...)
```

**Never:**

```typescript
if (subscription.status === ...)
```

inside feature implementations.

---

## 13. Limit Authority

| Limit | Authority path |
|---|---|
| Restaurant limits | `limits.restaurants` |
| Category limits | `limits.categories` |
| Item limits | `limits.items` |

No feature-specific limit calculations are allowed.

---

## 14. Revenue Authority

Revenue calculations must operate on **Paying Accounts**, not subscription rows.

| Account type | Included in revenue |
|---|---|
| TRIAL | No |
| ADMIN | No |
| NONE | No |
| PAYING | Yes |

---

## 15. Invoice Authority

```
Owner Account
    ↓
Subscription
    ↓
Invoice
```

Invoices never belong to restaurants.

---

## 16. Multi-Restaurant Model

Commercial rights belong to the owner account.

**Example:**

```
Owner
├─ Restaurant A
├─ Restaurant B
└─ Restaurant C

Plan = PROFESSIONAL
```

**Result:** All restaurants inherit Professional entitlements.

No restaurant-specific subscription logic.

---

## 17. Commercial Consumers

Future consumers of commercial authority:

- Restaurant Creation
- Restaurant Limits
- Category Limits
- Menu Item Limits
- Ordering
- Cart
- Checkout
- Call Waiter
- Request Bill
- Reports
- Templates
- Custom Colors
- Custom Fonts
- Invoices
- Revenue
- MRR
- Admin KPI

---

## 18. Success Criteria

The commercial architecture is considered complete when:

- [ ] One Owner
- [ ] One Active Subscription
- [ ] One Plan
- [ ] One Entitlement Source
- [ ] One Revenue Model
- [ ] One Commercial Authority
- [ ] No Hardcoded Plan IDs
- [ ] No Restaurant-Scoped Commercial Logic
- [ ] No Parallel Entitlement Systems

---

*Approved target specification. Supersedes legacy commercial behavior documented in PG-1A audit series.*
