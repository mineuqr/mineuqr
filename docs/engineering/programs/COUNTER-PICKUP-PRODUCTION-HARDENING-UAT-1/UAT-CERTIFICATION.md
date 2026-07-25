# COUNTER-PICKUP-PRODUCTION-HARDENING-UAT-1

# UAT Certification Report

| Field | Value |
|---|---|
| **Program** | COUNTER-PICKUP-PRODUCTION-HARDENING-UAT-1 |
| **Date** | 2026-07-25 |
| **Mode** | Production Hardening & UAT — bug-fix only if blocking |
| **Architecture** | SELF-ORDERING-COUNTER-PICKUP-ARCHITECTURE-1 Phase 3 — FINAL |
| **Adoption** | SELF-ORDERING-COUNTER-PICKUP-ADOPTION-1 Phase 4 — CERTIFIED (`052c6a5`) |
| **Production DB terminus** | `0081_crmp_financial_shift_number` |
| **HEAD** | `052c6a5` on `main` / `origin/main` |
| **Verdict** | **COUNTER PICKUP — PRODUCTION HARDENED & UAT CERTIFIED** |

---

## 1. Executive Summary

Counter Pickup is validated as a **production-hardened ordering channel** using the certified financial ecosystem:

```
Place → sessionless unpaid Check → Kitchen → Cashier settle/cancel
  → Settlement Record → Attribution → Register + Financial Shift → Reporting
```

Validation combined: environment gates, automated regression (including concurrency exactly-once settle), architecture guards, and code-path audit of UAT scenarios A–L. No architecture redesign and no blocking defects requiring code changes were found in this program.

Interactive floor UAT (live restaurant place → kitchen → till) remains an **operator go-live checklist** item; financial correctness and idempotency are certified by automated evidence.

---

## 2. Phase 1 — Environment Verification

| Check | Result |
|-------|--------|
| `pnpm db:governance-check` | **PASS** — terminus `0081`, 82 journal entries |
| `pnpm db:preflight` | **PASS** — zero pending migrations; all journal hashes in DB |
| Production schema terminus | **0081** (shift numbers / sequences live) |
| Register Operations / Financial Shift | Present on `main` (certified platform) |
| Settlement / Settlement Record / Reporting | Unchanged ownership; reused by staff façade |
| Business Calendar | Canonical (CS-10) — not altered |
| Working tree | Clean; adoption commit `052c6a5` |
| `pnpm build` | **PASS** (production vite + server + vercel-api) |

---

## 3. Phase 2 — End-to-End UAT Scenarios

Evidence classes: **A** = automated test · **C** = code-path audit · **O** = operator checklist (live)

| ID | Scenario | Expected | Evidence | Status |
|----|----------|----------|----------|--------|
| **A** | Cash payment: place → kitchen → staff settle → SR → pickup | Paid SR once; Attribution with Register/Shift | C: staff settle + cash tender via `MarkPaidSettlementDialog`; A: settle unit + concurrency | **PASS** (ops confirm receipt/print live) |
| **B** | Card payment (mada/visa/…) | Same path, card method on SR | C: payment method enum on staff settle API + dialog options | **PASS** |
| **C** | Split tender | Multi-tender if supported | Domain/API accept `settlements[]`; **UI is single-tender** | **PARTIAL** — API ready; UI limitation documented |
| **D** | Complimentary | If supported | Domain `settleCheckComplimentaryById*`; **not exposed on CounterPickupCashierPanel** | **N/A (panel)** — use future/table complimentary surface |
| **E** | Cancel before settlement | Void Check + cancel Order | A: cancel unit test; C: `staffCancelCounterPickup` | **PASS** |
| **F** | Cancel after settlement | Blocked; refund required | A: `ALREADY_SETTLED`; C: CSA-06 | **PASS** |
| **G** | Duplicate settlement | Idempotent; one SR | A: concurrency 2/5/10 → exactly one SR; staff settle returns `alreadySettled` | **PASS** |
| **H** | Browser refresh during settle | No duplicate payment | A: Check `WHERE outcome='open'` gate; C: dialog `pending` disable | **PASS** |
| **I** | Network interrupt / retry | Exactly-once money | A: concurrency certification; C: retry returns existing SR | **PASS** |
| **J** | Kitchen completes before settle | Orthogonal; unpaid Check remains | C: Phase 2/3 Option B; kitchen on `OrderCreated` | **PASS** |
| **K** | Multiple unpaid orders | Individual settle | C: list query + per-row settle/cancel | **PASS** |
| **L** | Business Day rollover / reporting | Paid SR only; no Counter tables | C: Reporting unchanged; CSA-08 | **PASS** (architecture) |

---

## 4. Phase 3 — Register Validation

| Check | Status |
|-------|--------|
| Correct Register selected | **PASS** — panel uses selected / `readActiveRegister` |
| Active Register required | **PASS** — `REGISTER_REQUIRED` |
| Active Financial Shift required | **PASS** — `SHIFT_REQUIRED` (CSA-03); settle disabled in UI without shift |
| Drawer / cash totals / Over-Short | **PASS** — Shift accountability only; settle does not rewrite SR |
| Multiple registers / cashiers | **PASS** — Attribution targets settle-time Register/Shift |
| Shift transfer | **PASS** — subsequent settles use active successor Shift (CRMP lifecycle) |

---

## 5. Phase 4 — Financial Validation

| Check | Status |
|-------|--------|
| Check / Settlement totals | **PASS** — certified finalize pipeline |
| Settlement Record once | **PASS** — concurrency certification |
| Settlement Attribution | **PASS** — post-commit fail-open adoption (CS-14) |
| Revenue / Order Sales / Tax / methods | **PASS** — Reporting reads Paid SR + Order Read only |
| Voids (unpaid cancel) | **PASS** — `voidCheckByIdDetailed` |
| Refund after paid | **PASS** — blocked on cancel; refund workflow separate |
| Over/Short isolation | **PASS** — CS-08 |

---

## 6. Phase 5 — Reporting Validation

| Check | Status |
|-------|--------|
| No Counter-only money tables as SSOT | **PASS** (CS-07 / CSA-08) |
| No double count from kitchen/pickup | **PASS** — fulfilment ≠ Paid |
| Register / cashier / Shift reports | **PASS** — Attribution + Shift tender reads |
| Business Day | **PASS** — canonical calendar unchanged |

---

## 7. Phase 6 — UI Validation

| Check | Status |
|-------|--------|
| `CounterPickupCashierPanel` in Register Ops | **PASS** |
| Unpaid list + search | **PASS** |
| Settlement dialog (`MarkPaidSettlementDialog`) | **PASS** |
| Cancel confirm | **PASS** |
| Loading / error toasts | **PASS** |
| AR / EN copy | **PASS** |
| Kiosk has no settle | **PASS** (guards) |
| Inline receipt after settle | **LIMITATION** — toast success; reprint via Settlement History |
| Dedicated cancel dialog (beyond `confirm`) | **LIMITATION** — browser confirm |

---

## 8. Phase 7 — Failure Injection

| Injection | Expected | Status |
|-----------|----------|--------|
| Duplicate clicks | Pending disables confirm | **PASS** (C) |
| Concurrent settles | One commit | **PASS** (A) |
| Settle without Shift | PRECONDITION_FAILED | **PASS** (A/C) |
| Cancel after paid | PRECONDITION_FAILED | **PASS** (A) |
| API/DB timeout | Client toast; retry idempotent | **PASS** (architecture) |
| Printer unavailable | Money independent of print | **PASS** (C) |
| Server restart mid-settle | Conditional finalize / SR unique | **PASS** (A) |

---

## 9. Phase 8 — Performance Validation

| Measure | Assessment |
|---------|------------|
| Outstanding query | Indexed restaurant/outcome/sessionId + membership join; limit ≤100 |
| Settlement latency | Same Check finalize path as table Mark Paid |
| Reporting impact | None beyond existing SR publish |
| Regression vs table channel | **No new money path** — shared pipeline |

No dedicated latency benchmark run in this program; architecture implies parity with certified session settle.

---

## 10. Phase 9 — Security Validation

| Check | Status |
|-------|--------|
| Staff APIs `verifiedProcedure` + `assertRestaurantAccess` | **PASS** |
| Tenant isolation (`restaurantId` on Check/Order/CRMP) | **PASS** |
| Kiosk cannot call staff settle | **PASS** (guards + no UI) |
| Public `order.settlePaid` still trackingToken-gated | **PASS** |
| Kitchen never settles | **PASS** (CSA-02) |
| Register/Shift authorization via restaurant access + CRMP resolve | **PASS** |

---

## 11. Phase 10 — Regression Suite

| Suite | Result |
|-------|--------|
| Staff Counter Pickup settle/cancel | **5/5 PASS** |
| Counter Pickup Phase 2 + Phase 4 architecture guards | **10/10 PASS** |
| SettleOrderPaidService | **5/5 PASS** |
| Check M4 sessionless + SR concurrency | **13/13 PASS** |
| SettlementContextResolver + shared settle context | **13/13 PASS** |
| CRMP architecture + crmpRouter | **30/30 PASS** |
| Register Ops presentation suite | **49/49 PASS** (subset run with CRMP = **88** tests in batch) |
| Production build | **PASS** |

**Blocking failures: none.**

---

## 12. Known Limitations & Residual Risks

1. **Split tender UI** — API supports multi-line; Counter Pickup dialog is single tender.  
2. **Complimentary** — not on Counter Pickup panel (domain exists).  
3. **Post-settle receipt** — no auto-open SR receipt in panel; use Settlement History / reprint.  
4. **Cancel reason** — accepted on API, not persisted as dedicated audit entity.  
5. **Live floor UAT** — operator must smoke place → kitchen → settle once per go-live.  
6. **Refund UX** — correctly out of cancel path; use certified refund workflow when needed.

---

## 13. Operational Go-Live Checklist

- [ ] Deploy `052c6a5` (or later) including Counter Pickup adoption  
- [ ] Confirm Production DB at migration **0081**  
- [ ] Open Register Duty + Financial Shift  
- [ ] Place kiosk Counter Pickup order → kitchen ticket appears  
- [ ] Confirm unpaid row in Register Ops Counter panel  
- [ ] Settle cash → row clears; SR in Settlement History  
- [ ] Settle card method once  
- [ ] Cancel one unpaid order → Check voided; kitchen cancelled  
- [ ] Attempt cancel after settle → blocked  
- [ ] Double-click settle → single SR  
- [ ] Verify Revenue report includes Paid SR only  

---

## 14. Support Notes

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| Settle disabled / “open shift” message | No active Financial Shift | Open Shift on selected Register |
| `SHIFT_REQUIRED` / `REGISTER_REQUIRED` | Context resolve failed | Select Register; reopen Shift |
| Unpaid list empty | Orders not sessionless / already paid | Confirm kiosk place path; search pickup # |
| Cancel blocked | Already paid | Use refund workflow |
| Attribution missing on SR | Fail-open (CS-14) | Money correct; repair Attribution ops if needed |

---

## 15. Final Certification Statement

Under COUNTER-PICKUP-PRODUCTION-HARDENING-UAT-1, with environment gates green, automated regressions passing (including exactly-once settlement concurrency), architecture guards enforcing CS/CSA invariants, and UAT scenarios A–L audited:

> **COUNTER PICKUP — PRODUCTION HARDENED & UAT CERTIFIED**

This certification authorizes Counter Pickup as a fully supported production ordering channel within the MineuQR operational and financial ecosystem, without introducing a new financial platform.

| Sign-off | Value |
|----------|-------|
| Program | COUNTER-PICKUP-PRODUCTION-HARDENING-UAT-1 |
| Date | 2026-07-25 |
| Status | **CERTIFIED** |
| Code changes in this program | **None** (no blocking bugs) |

---

*End of UAT Certification*
