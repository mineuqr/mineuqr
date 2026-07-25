# SELF-ORDERING-ORDER-SETTLEMENT-ADOPTION-1 — Implementation Report

| Field | Value |
|---|---|
| **Program** | SELF-ORDERING-ORDER-SETTLEMENT-ADOPTION-1 |
| **Type** | Production Adoption |
| **Date** | 2026-07-25 |
| **Architecture** | SELF-ORDERING-COUNTER-PICKUP-ARCHITECTURE-1 (approved) |
| **Verdict** | **SELF ORDERING — ORDER SETTLEMENT ADOPTION CERTIFIED** |

---

## 1. Executive Summary

Self Ordering (Kiosk) Orders settle entirely from the **Orders Workspace** on the certified money path:

```
Kiosk → Order → Sessionless Check (UNPAID) → Kitchen
  → Orders Workspace (Cashier Settle / Cancel)
  → Settlement Record → Attribution → Register → Financial Shift → Reporting
```

No Operational Session is created. No new settlement dialog. No financial redesign. Kitchen lifecycle unchanged.

---

## 2. Approved Workflow (adopted)

| Step | Surface | Behavior |
|------|---------|----------|
| Place | Kiosk | Sessionless Order + unpaid Check |
| Prep | Kitchen | Unchanged lifecycle |
| Settle / Cancel | **Orders Workspace** | Staff façade + `MarkPaidSettlementDialog` |
| Money | Check settle | Immutable Settlement Record |
| Accountability | Register + open Financial Shift | CSA-03 (existing) |
| Reporting | Settlement Records | Unchanged readers |

**Channel ownership**

| Surface | Owns |
|---------|------|
| Sessions | Waiter, Table QR |
| Orders | Self Ordering, Counter Pickup (sessionless settle) |

Register Ops Counter Pickup panel remains available; Orders is now the operational entry point for Self Ordering settlement.

---

## 3. Adoption Changes

### Orders Workspace (`OrdersWorkspacePanel`)

- Detects sessionless Orders (`sessionId == null`)
- Joins unpaid queue via `order.listUnpaidCounterPickup`
- For unpaid sessionless: shows **Settle** + **Cancel** (+ kitchen lifecycle)
- For paid sessionless: **Cancel blocked** (refund workflow only)
- Settle opens existing `MarkPaidSettlementDialog` (canonical catalog: نقدًا / بطاقة)
- Settle → `order.staffSettleCounterPickup` (requires active Register + open Shift)
- Cancel (unpaid) → `order.staffCancelCounterPickup` (void Check + cancel Order)
- Does **not** call `session.markPaid` or redirect to Sessions

### Reused platform (no redesign)

- `StaffCounterPickupSettlementService`
- `MarkPaidSettlementDialog` + unified payment catalog
- Settlement Record + Attribution fail-open
- Register / Financial Shift validation

### Explicit non-goals (honored)

- ✗ No Session fabrication  
- ✗ No Kitchen changes  
- ✗ No Settlement Record / Reporting redesign  
- ✗ No new payment dialog  

---

## 4. Files

| Path | Role |
|------|------|
| `client/src/components/orders-workspace/OrdersWorkspacePanel.tsx` | Settle/Cancel adoption |
| `client/src/lib/operational-workspace/operationalActions.ts` | `settle-self-ordering` + `getOrdersWorkspaceActions` |
| `client/src/lib/orders-workspace/selfOrderingOrderSettlementPresentation.ts` | Sessionless / unpaid helpers |
| `client/src/lib/order-presentation/mapOrderPresentation.ts` | Action override support |
| `server/order/application/StaffCounterPickupSettlementService.ts` | Documented Orders caller |
| Architecture + unit tests under `client/src/lib/.../__tests__/` | Guards |

---

## 5. Verification

| Check | Result |
|-------|--------|
| Self Ordering Order + sessionless Check | Existing place path |
| Appears in Orders | `order.read.listActive` |
| Settle from Orders | `staffSettleCounterPickup` + dialog |
| Register + Shift validation | CSA-03 reused |
| Settlement Record + Attribution | Existing pipeline |
| Reporting / Payment analytics | Unchanged SR readers |
| Cancel before settlement | `staffCancelCounterPickup` |
| Block cancel after settlement | Actions omit cancel; API rejects |
| Idempotent settlement | Existing staff settle |
| Duplicate click | Mutation `pending` gates dialog/actions |
| Kiosk remains non-settling | Architecture guard |

---

## 6. Certification

**SELF ORDERING — ORDER SETTLEMENT ADOPTION CERTIFIED**

Self Ordering settles from Orders without Session dependency. Existing settlement platform reused. Financial integrity preserved.
