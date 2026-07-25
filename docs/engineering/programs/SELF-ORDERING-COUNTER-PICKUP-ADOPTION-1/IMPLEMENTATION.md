# SELF-ORDERING-COUNTER-PICKUP-ADOPTION-1 — Implementation Report

| Field | Value |
|---|---|
| **Program** | SELF-ORDERING-COUNTER-PICKUP-ADOPTION-1 |
| **Phase** | Phase 4 — Cashier Cancel + Settle Adoption |
| **Date** | 2026-07-25 |
| **Architecture** | SELF-ORDERING-COUNTER-PICKUP-ARCHITECTURE-1 Phase 3 — CERTIFIED |
| **Verdict** | **PHASE 4 ADOPTION CERTIFIED** |

---

## 1. Executive Summary

Counter Pickup cashier settle/cancel is adopted on the **certified money path**:

```
sessionless unpaid Check → staff settle/void → Settlement Record → Attribution → Register + Financial Shift → Reporting
```

No new payment platform. No Session fabrication. Kiosk remains non-settling (Phase 2). Staff APIs require an **active Register** and **open Financial Shift** (CSA-03) before settle; Attribution remains fail-open after money commits (CS-14).

---

## 2. Runtime Audit (gaps closed)

| Gap | Resolution |
|-----|------------|
| `session.markPaid` cannot settle sessionless Checks (IMPACT-1) | New staff Check/Order façade — not Session Mark Paid |
| Public `order.settlePaid` needs `trackingToken` | `order.staffSettleCounterPickup` (verified, no token) |
| Order cancel left unpaid Check open | `order.staffCancelCounterPickup` voids Check then cancels Order |
| No unpaid queue UI | `CounterPickupCashierPanel` in Register Ops |
| Register/Shift hints | UI passes `readActiveRegister` / selected register; service resolves Shift |

**Already worked (reused):** `ensureCheckForOrder`, `settleCheckPaidByIdDetailed`, `voidCheckByIdDetailed`, SR publish, Attribution adoption, `MarkPaidSettlementDialog`, Register Ops Duty/Shift.

---

## 3. Files Created / Modified

| File | Role |
|------|------|
| `server/order/application/StaffCounterPickupSettlementService.ts` | List unpaid · settle · cancel |
| `server/order/application/__tests__/StaffCounterPickupSettlementService.test.ts` | Unit tests |
| `server/routers.ts` | `listUnpaidCounterPickup`, `staffSettleCounterPickup`, `staffCancelCounterPickup` |
| `client/.../CounterPickupCashierPanel.tsx` | Cashier unpaid queue UI |
| `client/.../RegisterOperationsPanel.tsx` | Host panel when register selected |
| `client/.../selfOrderingCounterPickupAdoption.architecture.guards.test.ts` | Phase 4 guards |
| This report | Certification |

**Not modified:** Check money domain, Settlement Record writers, Attribution model, kiosk settle UI, Reporting calculation engines.

---

## 4. API Surface

| Procedure | Auth | Behavior |
|-----------|------|----------|
| `order.listUnpaidCounterPickup` | verified | Open Checks with `sessionId IS NULL` + membership + order identity |
| `order.staffSettleCounterPickup` | verified | Resolve context → require Register+Shift → `settleCheckPaidByIdDetailed` → SR + Attribution |
| `order.staffCancelCounterPickup` | verified | If open → `voidCheckByIdDetailed` → `advanceOrderStatus(cancelled)`; blocks if paid |

Public `order.settlePaid` retained for legacy/capability paths; **kiosk must not call it** (guards).

---

## 5. Settlement Adoption

- Cashier selects unpaid row → `MarkPaidSettlementDialog` → tender → staff settle  
- Idempotent when already paid (returns existing SR)  
- Retry-safe via Check conditional finalize  
- Receipt: existing Settlement Record read/print surfaces  

---

## 6. Cancel Adoption

| State | Behavior |
|-------|----------|
| Before settle (open Check) | Void Check + cancel Order |
| After paid/complimentary | **Blocked** — refund workflow (no SR mutation) |
| Kitchen preparing/completed | Allowed for unpaid cancel (ops + kitchen stop via Order status) |
| Already voided + cancelled | Idempotent success |

Reason field accepted on API (audit extension point); Order status events via existing AdvanceOrderStatus.

---

## 7. Runtime Guards / Invariants

| ID | Enforcement |
|----|-------------|
| CS-01…CS-16 | Architecture + Phase 3; no Session fabricate; kiosk no settle |
| CSA-01 | verifiedProcedure staff only |
| CSA-02 | Kitchen unchanged — no settle |
| CSA-03 | Staff settle rejects without Register / active Shift |
| CSA-04 | Single SR via certified finalize |
| CSA-05 | Attribution immutable (existing CRMP) |
| CSA-06 | Cancel blocked after settle |
| CSA-07 | Receipt from SR id (existing) |
| CSA-08 | Reporting still Paid SR / Order Read |

Architecture guards assert staff façade uses Check settle/void, not `markPaid`.

---

## 8. Register / Financial Shift / Reporting

| Concern | Result |
|---------|--------|
| Register | Hint + resolved context; never owns revenue |
| Financial Shift | Required for staff settle; Attribution after SR |
| Drawer / Over-Short | Unaffected (Shift counts only) |
| Reporting | Unchanged sources — no Counter tables as money SSOT |

---

## 9. UI Adoption

- Panel under Register Operations (cashier already has Duty/Shift)  
- Settle disabled without open Shift  
- Cancel with confirm  
- Loading / toast errors  
- Kiosk: no financial actions (Phase 2 preserved)  

---

## 10. Tests

| Suite | Result |
|-------|--------|
| `StaffCounterPickupSettlementService.test.ts` | **5 PASS** |
| `selfOrderingCounterPickupAdoption.architecture.guards.test.ts` | **3 PASS** |
| Prior Phase 2 counter-pickup guards | **PASS** |
| Register Ops presentation guards | **PASS** |

---

## 11. Known Limitations

1. Split/partial multi-line tender UI still single-tender dialog (domain supports multi if API passed).  
2. Refund-after-paid not implemented in this panel (correctly blocked).  
3. Cancel `reason` not yet persisted as a dedicated audit entity.  
4. Interactive production smoke (place → kitchen → settle) remains operator UAT.  
5. Former “Phase 3 runtime validation” from Phase 2 roadmap can run as Phase 3b / pre-prod checklist.

---

## 12. ADR / Program References

- ADR-ARCH-019 · 020 · 022 · 026 · 028 · 030  
- SELF-ORDERING-COUNTER-PICKUP-ARCHITECTURE-1 Phase 1–3  
- REGISTER-OPERATIONS-FINAL-CERTIFICATION-1  
- SETTLEMENT-ATTRIBUTION-ADOPTION-1 · SETTLEMENT-CONTEXT-ADOPTION-1  

---

## 13. Final Certification

| Criterion | Status |
|-----------|--------|
| Sessionless Check used | **Met** |
| Cashier settles via canonical Check | **Met** |
| SR + Attribution once (certified pipeline) | **Met** |
| Register + Shift integrated | **Met** |
| Reporting unchanged | **Met** |
| No ownership violations / no new financial platform | **Met** |
| Tests + guards | **Met** |

### Verdict

**SELF-ORDERING-COUNTER-PICKUP-ADOPTION-1 Phase 4 is CERTIFIED.**

Counter Pickup is a production channel using the existing MineuQR financial ecosystem without introducing a new financial platform.

---

*End of IMPLEMENTATION.md*
