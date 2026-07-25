# REGISTER-OPERATIONS-RESPONSIBILITY-CLEANUP-1 — Implementation Report

| Field | Value |
|---|---|
| **Program** | REGISTER-OPERATIONS-RESPONSIBILITY-CLEANUP-1 |
| **Type** | Production Responsibility Cleanup |
| **Date** | 2026-07-25 |
| **Forensics** | REGISTER-UNPAID-QUEUE-FORENSICS-1 — COMPLETE |
| **Verdict** | **REGISTER OPERATIONS RESPONSIBILITY CLEANUP — PRODUCTION CERTIFIED** |

---

## 1. Executive Summary

Register Operations no longer hosts unpaid operational Order queues. Unpaid Self Ordering / Counter Pickup work remains exclusively in **Orders Workspace**. Waiter / Table QR unpaid work remains in **Sessions**. Register Ops retains financial responsibilities only (Registers, Financial Shifts, Settlement Records presentation, cash, closing, reconciliation).

No Settlement redesign. No Reporting changes. No Lifecycle Guard changes.

---

## 2. Approved responsibility boundaries (adopted)

| Surface | Owns |
|---------|------|
| **Orders** | Self Ordering, Counter Pickup — unpaid list, settle, cancel, complete after settle |
| **Sessions** | Waiter, Table QR — open sessions, settle, close after settle |
| **Register Operations** | Registers, Financial Shifts, Settlement Records, cash movements, history, shift closing, reconciliation |

Register Operations **MUST NOT** manage unpaid Orders or unpaid Sessions.

---

## 3. Implementation

### Removed from Register Ops

| Item | Action |
|------|--------|
| `CounterPickupCashierPanel.tsx` | **Deleted** |
| Mount in `RegisterOperationsPanel.tsx` | **Removed** |
| Unpaid Counter / Self Ordering settle+cancel UI on Register | **Gone** |

### Retained (Orders ownership)

| API / UI | Status |
|----------|--------|
| `order.listUnpaidCounterPickup` | Kept — Orders Workspace |
| `order.staffSettleCounterPickup` | Kept — Orders Workspace |
| `order.staffCancelCounterPickup` | Kept — Orders Workspace |
| `OrdersWorkspacePanel` settle/cancel | Unchanged |
| Session Mark Paid / close | Unchanged |

### Files

- `client/src/components/register-operations/RegisterOperationsPanel.tsx` — cleanup header + panel removed  
- `client/src/components/register-operations/CounterPickupCashierPanel.tsx` — deleted  
- `server/order/application/StaffCounterPickupSettlementService.ts` — caller note updated  
- Architecture guards updated / added  

---

## 4. Historical test data cleanup

Forensics classified visible unpaid Register cards as open sessionless Checks (often experimental / leftover test activity).

**One-time administrative script** (same confirm pattern as `zero-epoch-smoke-cleanup.mjs`):

```bash
# Inventory (safe)
node scripts/register-ops-unpaid-test-cleanup.mjs --dry-run --restaurantId=<ID>

# Execute (requires explicit confirm + restaurant scope)
REGISTER_OPS_UNPAID_TEST_CLEANUP_CONFIRM=YES \
  node scripts/register-ops-unpaid-test-cleanup.mjs --execute --restaurantId=<ID>

# Optional allow-list
... --orderIds=12,34
```

**Script rules**

- Targets only `operational_checks.outcome = 'open'` AND `sessionId IS NULL`  
- Voids Check + deactivates membership; cancels Order when status ∈ pending/preparing/ready/cancelled  
- **Does not** delete Settlement Records  
- **Does not** touch Session Checks  
- **No** automatic / cron deletion  
- Execute refused without `REGISTER_OPS_UNPAID_TEST_CLEANUP_CONFIRM=YES` and `--restaurantId`

**Executed in this certification environment:**

| Step | Result |
|------|--------|
| Dry-run | **6** open sessionless unpaid Checks — all `restaurantId=720007` (smoke/test), `grandTotal=10.00`, `orderStatus=served` |
| Execute | `REGISTER_OPS_UNPAID_TEST_CLEANUP_CONFIRM=YES --restaurantId=720007` → **ok=6 fail=0** |
| Post dry-run | Queue empty for those historical opens (Checks voided; memberships deactivated; served Order kitchen status retained) |

Artifacts: `artifacts/register-ops-responsibility-cleanup-1/`.

---

## 5. Non-regression

| Area | Status |
|------|--------|
| Orders unpaid settle/cancel | **Preserved** |
| Sessions settle/close | **Preserved** |
| Register / Financial Shift UI | **Preserved** |
| Settlement Record / Reporting / Analytics | **Unchanged** |
| Lifecycle Guards | **Unchanged** |
| Kitchen | **Unchanged** |

---

## 6. Verification

| Check | Result |
|-------|--------|
| Register Ops contains no unpaid Order queue | ✓ architecture guards |
| `CounterPickupCashierPanel.tsx` absent | ✓ |
| Orders retains list/settle/cancel | ✓ |
| Staff settle APIs still verifiedProcedure | ✓ |
| Kiosk remains non-settling | ✓ |
| Cleanup script dry-run/execute gated | ✓ |

---

## 7. Certification

**REGISTER OPERATIONS RESPONSIBILITY CLEANUP — PRODUCTION CERTIFIED**

Register Operations is financial-only. Orders owns unpaid Orders. Sessions owns unpaid Sessions. Historical experimental unpaid sessionless Checks are cleaned via the one-time confirmed admin script (operator execute with restaurant scope).
