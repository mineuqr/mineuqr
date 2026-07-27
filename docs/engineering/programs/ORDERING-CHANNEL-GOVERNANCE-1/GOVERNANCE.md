# ORDERING-CHANNEL-GOVERNANCE-1 — Ordering Channel Governance Specification

| Field | Value |
|-------|--------|
| **Program** | ORDERING-CHANNEL-GOVERNANCE-1 |
| **Type** | Governance |
| **Status** | Implemented — pending Architecture Authority approval |
| **Date** | 2026-07-27 |

## Decision

**OrderingChannelId** is the single source of truth for ordering-channel provenance on every order.

- No identityScope inference for channels
- No UI / payment / session-alone channel inference
- No default channel at persistence
- Future channels require **registry registration only**

## Supported channels (registry)

| OrderingChannelId | Lifecycle | Reporting id |
|-------------------|-----------|--------------|
| `table_session` | active | `table` |
| `waiter_tablet` | active | `waiter` |
| `qr` | active | `qr` |
| `kiosk` | active | `kiosk` |
| `mobile` | registered | `mobile` |
| `marketplace` | registered | `marketplace` |
| `delivery_partner` | registered | `delivery_partner` |
| `call_center` | registered | `call_center` |

## Place governance

`PlaceOrderService` calls `assertOrderingChannelId` before persistence.

Stamps:

| Path | Stamp |
|------|-------|
| `order.create` | `qr` |
| `order.placeAsWaiter` | `waiter_tablet` |
| `placeWaiterOrderForDevice` | `waiter_tablet` |
| `order.placeWithIdentity` | required client `OrderingChannelId` |

Table Session is registry-active; place commands may stamp `table_session` explicitly. Live guest QR remains `qr` (distinct channel).

## Reporting governance

`resolveReportingSalesChannel` consumes **only** `orderingChannel`.

Missing stamp → reporting bucket `unassigned` (explicit missing provenance — **not** TABLE inference).

## Non-goals (protected)

Revenue / Settlement / Refund / Tax law, Business Identity, ownerships, Reporting API/DTO shapes, financial formulas — unchanged.
