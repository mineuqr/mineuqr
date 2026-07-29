# Feature Catalog — Deliverable 3

**Program:** SUBSCRIPTION-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29  
**Revision:** SP-17 Feature Identity Stability · Plans Are Presentation / Features Are Contracts

---

## 1. Catalog law (**SP-17**)

Features are **immutable commercial contracts**.  
**Law:** Plans Are Presentation. Features Are Contracts.

| Rule | Statement |
|------|-----------|
| Stable Feature Key | Permanent identifier (e.g. `feature.realtime`) |
| Never silently renamed | Deprecate + successor (**SP-17**) |
| Never reused | Different semantics ⇒ new key (**SP-17**) |
| Never change semantics | In-place meaning change forbidden (**SP-17**) |
| Deprecation allowed | Deprecated keys remain valid historical contracts |
| Outlive plans | Plans reference features; features persist (**SP-20**) |
| Not permissions | RBAC has separate permission keys |
| Not domain code | Domains implement behavior behind the feature |
| Not plan identity | Domains never evaluate plan keys (**SP-19**) |

Aligned in spirit with RBAC **AP-15** (permission stability) — commercial feature keys are the Subscription plane’s stable contracts.

### Lifecycle

```
active → deprecated (successor set; historically valid) → retired (no new grants; key reserved)
```

New functionality ⇒ **new** Feature Key.

---

## 2. Feature record (canonical shape)

| Field | Purpose |
|-------|---------|
| `featureKey` | Immutable contract id |
| `displayName` | Localized presentation |
| `category` | Grouping (ops, reporting, channels, AI, …) |
| `lifecycle` | `active` \| `deprecated` \| `retired` \| `internal` \| `beta` |
| `visibility` | `public` \| `hidden` \| `internal` \| `partner` |
| `deprecation` | Successor key, sunset policy |
| `description` | Commercial meaning (not implementation) |

---

## 3. Canonical feature examples

| Feature key | Display (example) | Category |
|-------------|-------------------|----------|
| `feature.orders` | Orders | Core ops |
| `feature.kitchen_display` | Kitchen Display | Ops surfaces |
| `feature.realtime` | Realtime | Platform |
| `feature.qr_ordering` | QR Ordering | Channels |
| `feature.waiter_platform` | Waiter Platform | Channels |
| `feature.kiosk` | Kiosk | Channels |
| `feature.reports` | Reports | Reporting |
| `feature.advanced_reports` | Advanced Reports | Reporting |
| `feature.excel_export` | Excel Export | Reporting |
| `feature.api` | API Access | Integration |
| `feature.ai_assistant` | AI Assistant | AI |
| `feature.multi_branch` | Multi Branch | Scale |
| `feature.custom_branding` | Custom Branding | Branding |
| `feature.reservations` | Reservations | Future modules |
| `feature.loyalty` | Loyalty | Future modules |
| `feature.delivery` | Delivery | Future modules |

Future modules add keys to the catalog — they do not invent ad-hoc string checks in domains.

---

## 4. Categories (illustrative)

Core ops · Channels · Devices · Reporting · Integration · AI · Branding · Growth / CRM · Platform / Internal

---

## 5. Deprecation policy

```
active → deprecated (successor set) → retired (no new grants)
```

Historical subscriptions may retain deprecated features until migration policy forces successor evaluation. Keys remain reserved forever.

---

## 6. Anti-patterns

| Forbidden | Why |
|-----------|-----|
| `feature.cashier_only_refunds` | Role-coupled — belongs in RBAC |
| Embedding SKU price in feature key | Pricing ≠ feature |
| Domain `if (plan === 'enterprise')` | Violates **SP-19** / canonical law |
| Silent rename `feature.reports` → `feature.analytics` | Violates **SP-17** |
| Reusing `feature.reports` for a different product | Violates **SP-17** |
| Redesigning features to fit a new plan name | Violates **SP-20** |
