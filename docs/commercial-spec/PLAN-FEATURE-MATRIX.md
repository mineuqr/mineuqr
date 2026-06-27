# PLAN-FEATURE-MATRIX.md

**PG-1C.1B — Plan Feature Matrix**  
**Status:** APPROVED COMMERCIAL CONTRACT  
**Priority:** P0  

**Upstream specifications:**

- [COMMERCIAL-AUTHORITY-SPEC.md](../../COMMERCIAL-AUTHORITY-SPEC.md) (PG-1C.1A)
- PG-1B.1 Target Commercial Architecture
- [COMMERCIAL-DATA-SNAPSHOT.md](../commercial-audit/COMMERCIAL-DATA-SNAPSHOT.md) (PG-1B.2 baseline)

**Purpose:** Official source of truth for plans, features, limits, commercial flags, and validation rules. Direct input for **PG-1C.2 Commercial Authority Layer Implementation**.

**Authority rule:** All runtime decisions MUST consume output from `resolveCommercialEntitlements()`. This matrix defines what that function MUST expose. No feature may implement parallel commercial logic.

---

## 1. Plan Definitions

### 1.1 Plan taxonomy

| Plan key | Type | Purpose | Scope | Commercial behavior |
|---|---|---|---|---|
| **TRIAL** | Account state (not a catalog plan) | Evaluate full restaurant operations before purchase | Owner account | Professional feature access for 14 days; excluded from revenue, MRR, invoices, and subscriber metrics |
| **BASIC** | Paid catalog plan | Single-location digital QR menu | Owner account | QR menu + templates; no ordering stack; counts as **PAYING** when active |
| **PROFESSIONAL** | Paid catalog plan | Full single-brand restaurant operations (up to 5 locations) | Owner account | Full operational feature set; counts as **PAYING** when active |
| **ENTERPRISE** | Paid catalog plan | Multi-location / chain operations | Owner account | All Professional features + unlimited location scale; counts as **PAYING** when active |
| **ADMIN** | Operational account type | Platform administration | Global | Full access; **outside** all commercial analytics and billing |
| **NONE** | Account state | No active commercial relationship | Owner account | Public QR menus may remain visible; owner mutations gated by `NONE` rules |

### 1.2 Trial (account state)

| Attribute | Value |
|---|---|
| Underlying plan entitlement | `PROFESSIONAL` |
| Subscription status | `TRIAL` |
| Duration | 14 calendar days from `trialStartsAt` |
| Feature set | Same as **PROFESSIONAL** (see §3) |
| Limits | Same as **PROFESSIONAL** (see §2) |
| Revenue / MRR / ARR | **Excluded** |
| Invoices | **Not eligible** |
| Subscriber / trial KPI counts | **Excluded** from commercial reporting |
| Transitions | Expires to **NONE** (or **PAYING** on conversion) — never stacks with paid |

### 1.3 Basic

| Attribute | Value |
|---|---|
| Purpose | Single-location QR menu plan |
| Scope | Owner account → all owned restaurants inherit Basic entitlements |
| Commercial behavior | **PAYING** when `status = active`; revenue- and invoice-eligible |
| Multi-restaurant | **No** — `restaurantLimit = 1` |

### 1.4 Professional

| Attribute | Value |
|---|---|
| Purpose | Full restaurant operation plan |
| Scope | Owner account → all owned restaurants inherit Professional entitlements |
| Commercial behavior | **PAYING** when `status = active`; revenue- and invoice-eligible |
| Multi-restaurant | **Yes** — up to `restaurantLimit = 5` |

### 1.5 Enterprise

| Attribute | Value |
|---|---|
| Purpose | Multi-location / enterprise business plan |
| Scope | Owner account → all owned restaurants inherit Enterprise entitlements |
| Commercial behavior | **PAYING** when `status = active`; revenue- and invoice-eligible |
| Multi-restaurant | **Yes** — unlimited locations (see §2.3) |
| Features | All **PROFESSIONAL** features (§3) |

### 1.6 Admin

| Attribute | Value |
|---|---|
| Purpose | Operational / platform administration |
| Scope | Global (not a commercial customer) |
| Commercial behavior | **Outside** revenue, MRR, ARR, subscriptions, trials, invoices, and subscriber analytics |
| Subscription required | **No** |
| Access | Unlimited restaurants, limits, and features (§2, §3) |

### 1.7 NONE (no commercial access)

| Attribute | Value |
|---|---|
| Purpose | Owner account without valid trial or paid subscription |
| Scope | Owner account |
| Commercial behavior | Excluded from revenue; not invoice-eligible |
| Owner dashboard | Create/manage actions gated per feature matrix (§3) |
| Public guest menu | May remain accessible (non-commercial, tenant content) |

---

## 2. Limits Matrix

### 2.1 Official limit keys

All limits are **account-level**. Restaurants inherit; no per-restaurant commercial limits.

| Authority path | Matrix key | Description |
|---|---|---|
| `limits.restaurants` | `restaurantLimit` | Max owned restaurants |
| `limits.categories` | `categoryLimit` | Max categories **per restaurant** |
| `limits.items` | `itemLimit` | Max menu items **per restaurant** |

Legacy or feature code MUST NOT compute limits outside `resolveCommercialEntitlements()`.

### 2.2 Limits by plan

| Plan | `restaurantLimit` | `categoryLimit` | `itemLimit` |
|---|---|---|---|
| **TRIAL** | 5 | 25 | 500 |
| **BASIC** | 1 | 10 | 100 |
| **PROFESSIONAL** | 5 | 25 | 500 |
| **ENTERPRISE** | `null` | `null` | `null` |
| **ADMIN** | `null` | `null` | `null` |
| **NONE** | 0 | 0 | 0 |

**Trial limits** mirror **PROFESSIONAL** (PG-1C.1A §9).

**Catalog alignment note:** Numeric caps for Basic / Professional match approved catalog reference values (`COMMERCIAL-DATA-SNAPSHOT.md` PG-1B.2: Basic 1/10/100; Professional 5/25/500). Plan IDs in database are implementation details only.

### 2.3 Unlimited representation standard

| Rule | Definition |
|---|---|
| **Canonical value** | `null` |
| **Meaning** | No enforcement cap for that dimension |
| **Forbidden** | Magic numbers (e.g. `999`, `9999`) in entitlement output |
| **Enforcement** | `if (limit === null) → allow`; `if (count >= limit) → deny` |
| **Applies to** | Enterprise and Admin for all limit keys |

### 2.4 Limit enforcement consumers

| Consumer | Limit checked | Error code |
|---|---|---|
| Restaurant create | `restaurantLimit` | `RESTAURANT_LIMIT_REACHED` |
| Category create | `categoryLimit` (per restaurant) | `RESTAURANT_LIMIT_REACHED`¹ |
| Menu item create | `itemLimit` (per restaurant) | `RESTAURANT_LIMIT_REACHED`¹ |

¹ Category/item quota violations use the same commercial denial family; implementation MAY map to dedicated codes in PG-1C.2 if required. Primary canonical code for hard caps: `RESTAURANT_LIMIT_REACHED` for restaurant count; feature-specific quota messaging MAY use `FEATURE_NOT_AVAILABLE` with limit context.

---

## 3. Feature Matrix

### 3.1 Feature keys (authority paths)

Each capability maps to `features.<key>` in `resolveCommercialEntitlements()` output.

| Key | Description |
|---|---|
| `qrMenu` | Public digital menu (slug, categories, items) |
| `categories` | Category CRUD |
| `menuImages` | Menu item / offer image upload |
| `search` | In-menu search (guest) |
| `ordering` | Table ordering enablement (master gate for order pipeline) |
| `cart` | Guest cart UI |
| `checkout` | Order submission (`order.create`) |
| `requestBill` | Guest request bill action |
| `callWaiter` | Guest call waiter action |
| `orderTracking` | Guest / staff order status tracking |
| `reports` | Owner sales / stats reports |
| `excelExport` | Excel export of reports |
| `hotelMode` | Hotel property mode (`tableLabel = rooms`) |
| `roomQr` | Room-based QR ordering (requires hotel mode + tables) |
| `dynamicServiceCatalog` | Time-bound offers / dynamic catalog (offers module) |
| `templates` | Premium menu templates |
| `customColors` | Custom theme colors |
| `customFonts` | Custom theme fonts |

**Ordering stack rule:** `cart`, `checkout`, and `orderTracking` require `features.ordering === true`.

**Hotel stack rule:** `roomQr` requires `features.hotelMode === true`.

### 3.2 Availability matrix

Legend: **Y** = enabled | **N** = disabled | **—** = not applicable

| Feature key | TRIAL | BASIC | PROFESSIONAL | ENTERPRISE | ADMIN | NONE |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `qrMenu` | Y | Y | Y | Y | Y | Y² |
| `categories` | Y | Y | Y | Y | Y | N |
| `menuImages` | Y | Y | Y | Y | Y | N |
| `search` | Y | Y | Y | Y | Y | Y² |
| `ordering` | Y | N | Y | Y | Y | N |
| `cart` | Y | N | Y | Y | Y | N |
| `checkout` | Y | N | Y | Y | Y | N |
| `requestBill` | Y | N | Y | Y | Y | N |
| `callWaiter` | Y | N | Y | Y | Y | N |
| `orderTracking` | Y | N | Y | Y | Y | N |
| `reports` | Y | N | Y | Y | Y | N |
| `excelExport` | Y | N | Y | Y | Y | N |
| `hotelMode` | Y | N | Y | Y | Y | N |
| `roomQr` | Y | N | Y | Y | Y | N |
| `dynamicServiceCatalog` | Y | N | Y | Y | Y | N |
| `templates` | Y | Y | Y | Y | Y | N |
| `customColors` | Y | N | Y | Y | Y | N |
| `customFonts` | Y | N | Y | Y | Y | N |

² **NONE** — public guest read paths for existing menu content may remain available without owner write access; owner management features are **N**.

### 3.3 Plan feature summary (narrative)

| Plan | Enabled capability groups |
|---|---|
| **TRIAL** | Full **PROFESSIONAL** set (§3.2); time-bound |
| **BASIC** | QR menu, categories, images, search, templates only |
| **PROFESSIONAL** | Full operational + reporting + hotel + customization |
| **ENTERPRISE** | Same as Professional (scale via limits only) |
| **ADMIN** | All features, all limits uncapped |
| **NONE** | Public menu consumption only where content exists; no commercial owner features |

---

## 4. Commercial Flags

### 4.1 Official flags

| Flag | Authority path | Meaning |
|---|---|---|
| `isTrial` | `commercial.isTrial` | Account is in 14-day Professional trial |
| `isPaid` | `commercial.isPaid` | Account has active paid subscription (Basic, Professional, or Enterprise) |
| `isEnterprise` | `commercial.isEnterprise` | Active paid plan is Enterprise |
| `isAdmin` | `commercial.isAdmin` | User role is platform admin (operational, non-commercial) |

### 4.2 Flag matrix by plan / account state

| Plan / state | `isTrial` | `isPaid` | `isEnterprise` | `isAdmin` |
|---|:---:|:---:|:---:|:---:|
| **TRIAL** | true | false | false | false |
| **BASIC** (active) | false | true | false | false |
| **PROFESSIONAL** (active) | false | true | false | false |
| **ENTERPRISE** (active) | false | true | true | false |
| **ADMIN** | false | false | false | true |
| **NONE** | false | false | false | false |

### 4.3 Commercial participation flags (derived)

These are not independent toggles; they MUST be derived from account type and flags above.

| Derived rule | TRIAL | BASIC | PRO | ENTERPRISE | ADMIN | NONE |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Counts in MRR | N | Y | Y | Y | N | N |
| Counts in ARR / revenue | N | Y | Y | Y | N | N |
| Invoice eligible | N | Y | Y | Y | N | N |
| Subscriber metrics | N | Y | Y | Y | N | N |
| Trial metrics | N | N | N | N | N | N |

**Account type mapping (PG-1C.1A §3):**

| Condition | `accountType` |
|---|---|
| `isAdmin === true` | `ADMIN` |
| `isTrial === true` | `TRIAL` |
| `isPaid === true` | `PAYING` |
| Otherwise | `NONE` |

---

## 5. Validation Rules

### 5.1 Restaurant limit enforcement

```
IF accountType === ADMIN → allow
IF limits.restaurants === null → allow
IF ownedRestaurantCount >= limits.restaurants → RESTAURANT_LIMIT_REACHED
ELSE → allow
```

- Count source: restaurants where `restaurants.userId = ownerId`.
- Applies at: `restaurant.create` and any future bulk-import paths.

### 5.2 Category / item limit enforcement

```
IF accountType === ADMIN → allow
IF limits.categories === null → allow (categories)
IF limits.items === null → allow (items)
IF perRestaurantCategoryCount >= limits.categories → deny (quota)
IF perRestaurantItemCount >= limits.items → deny (quota)
```

- Denial code: `FEATURE_NOT_AVAILABLE` or limit-specific mapping in PG-1C.2.

### 5.3 Trial expiration

```
IF accountType === TRIAL AND now >= trialEndsAt → treat as NONE for owner actions
Feature checks on expired trial → TRIAL_EXPIRED
```

- Trial MUST NOT convert to paid automatically.
- Expired trial MUST NOT appear in MRR, revenue, or invoice flows.
- DB `status` MAY remain `trial`; authority layer MUST treat expired trial as non-entitled.

### 5.4 Feature access checks

```
IF accountType === ADMIN → allow (all features)
IF features[featureKey] !== true → FEATURE_NOT_AVAILABLE
ELSE → allow
```

- Forbidden in consumers: `if (planId === …)`, `if (subscription.status === …)`, direct `user_subscriptions` reads.

### 5.5 Subscription ownership validation

| Rule | Enforcement |
|---|---|
| One owner → one active commercial subscription | At most one row with `status IN ('trial', 'active')` per `userId` |
| Trial XOR paid | MUST NOT have concurrent trial + active paid |
| Account-level scope only | `user_subscriptions.restaurantId` MUST NOT drive commercial authority (legacy scoped rows disallowed for new writes post-launch) |
| Admin users | MUST NOT require subscription row for access |
| Admin users | MUST NOT be counted as paying accounts in revenue |

Violation handling: data integrity errors logged; authority layer returns `NONE` or rejects mutation with `FORBIDDEN`.

### 5.6 Canonical error codes

| Code | HTTP / tRPC mapping | When |
|---|---|---|
| `RESTAURANT_LIMIT_REACHED` | `FORBIDDEN` | `ownedRestaurantCount >= limits.restaurants` |
| `TRIAL_EXPIRED` | `FORBIDDEN` | Trial period elapsed; owner feature requested |
| `FEATURE_NOT_AVAILABLE` | `FORBIDDEN` | `features.<key> !== true` for requested capability |
| `FORBIDDEN` | `FORBIDDEN` | Auth failure, tenant boundary, or unspecified commercial denial |

Consumers SHOULD prefer specific codes over generic `FORBIDDEN` when the matrix defines them.

---

## 6. Admin Rules

Admin is documented as **outside the commercial customer model**.

| Rule | Value |
|---|---|
| Outside revenue | **Yes** — never counted in revenue / ARR |
| Outside MRR | **Yes** |
| Outside ARR | **Yes** |
| No subscription required | **Yes** |
| Full access | **Yes** — all features **Y**, all limits `null` |
| Invoice participation | **No** — admin accounts are not invoice targets |
| Trial participation | **No** |
| Subscriber KPI participation | **No** |
| Revenue operator actions | Admin MAY generate invoices **for paying owners** (operational tooling); admin account itself is not a billing subject |

**Implementation note:** `users.role === 'admin'` determines `isAdmin`. Admin commercial flags override plan/subscription for entitlement output only.

---

## 7. Future Extension Rules

A new catalog plan (e.g. `STARTER`, `FRANCHISE`) MUST NOT ship unless all of the following are satisfied:

| # | Requirement |
|---|---|
| 1 | Plan name added to this matrix (§1, §2, §3, §4) |
| 2 | Every feature key in §3.2 has an explicit Y/N row for the new plan |
| 3 | All limit keys in §2.2 have explicit values or `null` |
| 4 | Commercial flags behavior defined in §4.2 |
| 5 | Revenue / MRR / invoice participation defined in §4.3 |
| 6 | `COMMERCIAL-AUTHORITY-SPEC.md` updated if philosophy or account types change |
| 7 | `resolveCommercialEntitlements()` updated as the **only** runtime source |
| 8 | No hardcoded plan IDs introduced |
| 9 | No restaurant-scoped commercial authority |
| 10 | PG-1C.2+ tests cover new plan rows |
| 11 | Migration / snapshot documented if existing subscribers transition |
| 12 | Marketing / Pricing UI aligned with this matrix before launch |

**Forbidden without governance review:**

- Feature-specific plan checks outside authority layer
- Parallel entitlement resolvers
- Per-restaurant subscription scope for commercial decisions
- Stacking multiple paying subscriptions per owner

---

## 8. Authority Output Contract (PG-1C.2 input)

`resolveCommercialEntitlements(ownerId)` MUST return at minimum:

```typescript
{
  accountType: "ADMIN" | "TRIAL" | "PAYING" | "NONE",
  plan: "BASIC" | "PROFESSIONAL" | "ENTERPRISE" | null,
  status: "trial" | "active" | "canceled" | "expired" | null,
  limits: {
    restaurants: number | null,
    categories: number | null,
    items: number | null,
  },
  features: {
    qrMenu: boolean,
    categories: boolean,
    menuImages: boolean,
    search: boolean,
    ordering: boolean,
    cart: boolean,
    checkout: boolean,
    requestBill: boolean,
    callWaiter: boolean,
    orderTracking: boolean,
    reports: boolean,
    excelExport: boolean,
    hotelMode: boolean,
    roomQr: boolean,
    dynamicServiceCatalog: boolean,
    templates: boolean,
    customColors: boolean,
    customFonts: boolean,
  },
  commercial: {
    isTrial: boolean,
    isPaid: boolean,
    isEnterprise: boolean,
    isAdmin: boolean,
    countsInMrr: boolean,
    countsInRevenue: boolean,
    invoiceEligible: boolean,
  },
}
```

Shape is normative for PG-1C.2; field names MAY be aliased in implementation if documented.

---

## 9. Success Criteria

This document is the official contract when:

- [x] All plans in §1 are defined with purpose, scope, and commercial behavior
- [x] Limits matrix §2 includes `restaurantLimit` and related keys with unlimited standard
- [x] Feature matrix §3 covers all approved capability categories
- [x] Commercial flags §4 defined for every plan
- [x] Validation rules §5 include canonical error codes
- [x] Admin rules §6 documented
- [x] Extension rules §7 defined
- [ ] PG-1C.2 implements `resolveCommercialEntitlements()` conforming to §8 (future phase)

---

## Document control

| Field | Value |
|---|---|
| Version | 1.0 |
| Supersedes | Ad-hoc tier behavior in PG-1A audit series (historical reference only) |
| Next phase | PG-1C.2 — Commercial Authority Layer Implementation |

---

*Specification only. No implementation. No schema changes. No migrations.*
