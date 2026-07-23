# SETTLEMENT-UI-CLEANUP-1 — Report

| Field | Value |
|---|---|
| **Program** | SETTLEMENT-UI-CLEANUP-1 |
| **Date** | 2026-07-23 |
| **Type** | Presentation-only cleanup |
| **Status** | Complete |
| **Prior** | MULTI-CHECK-ALLOCATION-PRODUCTION-ADOPTION-1 Rev 2.0 (MCA UI dormant) |

---

## 1. Root cause

Production Session Details still mounted **`SplitPaymentPanel`** inside `DiningSessionWorkspaceSheet`.

That panel:

- Renders the bilingual card title **“Split Payments / المدفوعات المقسّمة”**
- Executes `splitPayment.listByCheck`, `getOutstanding`, `getSummaryByCheck`, `listAttemptsByCheck` whenever the workspace is open
- Shows loading / empty / status UI even when no split payments exist

Multi Check Allocation had already been unmounted (dormant), but **Split Payment operator UI remained active**, violating the adopted settlement roadmap (Settlement Record–first; allocation/split advanced UX suspended).

---

## 2. Files modified

| File | Change |
|------|--------|
| `client/src/components/dashboard/DiningSessionWorkspaceSheet.tsx` | Removed `SplitPaymentPanel` mount, import, and `splitPayment.listByCheck` runtime log |
| `client/src/components/dashboard/DiningSessionActionBar.tsx` | Removed orphaned `splitPayment.*` invalidations |
| `client/src/components/dashboard/SessionRowQuickActions.tsx` | Removed orphaned `splitPayment.*` invalidations |
| `client/src/components/split-payment/SplitPaymentPanel.tsx` | Documented UI dormant |
| `client/src/lib/split-payment-presentation/splitPaymentCapability.ts` | **Added** — dormant capability flag |
| `client/src/lib/split-payment-presentation/index.ts` | Export capability flags |
| `client/src/lib/split-payment-presentation/__tests__/splitPaymentPresentation.architecture.guards.test.ts` | Guards updated for suspension |
| `client/src/lib/multi-check-allocation-presentation/__tests__/multiCheckAllocationPresentation.architecture.guards.test.ts` | Guards aligned (no SP/MCA mounts) |
| `docs/engineering/programs/SETTLEMENT-UI-CLEANUP-1/REPORT.md` | This report |

---

## 3. Removed presentation dependencies

| Dependency | Status |
|------------|--------|
| `SplitPaymentPanel` in Check Workspace | **Unmounted** |
| `MultiCheckAllocationPanel` in Check Workspace | Already unmounted; confirmed absent |
| `splitPayment.listByCheck` (and related) queries from payment/workspace sheet | **Not executed** |
| `useDevQueryRuntimeLog("splitPayment.listByCheck")` | **Removed** |
| Action-bar / quick-action `splitPayment.*` invalidations | **Removed** |
| Dead imports of Split Payment panel | **Removed** |

**Preserved (dormant, reactivation supported):**

- `client/src/components/split-payment/*`
- `client/src/lib/split-payment-presentation/*`
- `client/src/components/multi-check-allocation/*`
- `client/src/lib/multi-check-allocation-presentation/*`
- All Domain / Persistence / Integration / Projection / API for SP + MCA

**Capability flags:**

| Capability | UI | Core | Reactivation |
|------------|----|------|--------------|
| Split Payment | Disabled (`SPLIT_PAYMENT_UI_ENABLED = false`) | Active | Supported |
| Multi Check Allocation | Disabled (`MULTI_CHECK_ALLOCATION_UI_ENABLED = false`) | Active | Supported |

---

## 4. Verification — Domain / API / DB untouched

| Layer | Untouched evidence |
|-------|-------------------|
| Domain | No edits under `shared/operational-session/check/splitPayment` or `multiCheckAllocation` (commands/contracts) |
| Persistence / DB | No schema or migration changes; `0074` / `0075` unchanged |
| Integration | No edits to `checkSplitPaymentIntegration` / `checkMultiCheckAllocationIntegration` |
| Projection | No builder/store/materializer edits |
| API | `splitPayment` + `multiCheckAllocation` routers remain mounted on `appRouter` |
| Settlement Mark Paid | `MarkPaidSettlementDialog` + `session.markPaid` path unchanged |

Guards assert API/Projection/Integration markers still present after cleanup.

---

## 5. Screenshots before / after

### Before (production defect)

Session Details showed a dedicated card:

- Title: **المدفوعات المقسمة / Split Payments**
- Loading spinner: “جاري تحميل المدفوعات… / Loading payments…”
- Triggered by mounted `SplitPaymentPanel` + active `splitPayment.*` queries

*(Captured in operator screenshot provided with the program brief.)*

### After (expected)

Session Details Check Workspace no longer renders:

- Split Payments card
- Multi Check Allocation card
- Allocation/split loading spinners or empty allocation states from those panels

Remaining settlement-relevant operator surfaces in the sheet:

- Session overview / orders summary
- Order Settlement panel (per-order settlement read — not Split Payment / MCA)
- Actions: Mark Paid / Complimentary / Close (`DiningSessionActionBar`)
- Session timeline

**Record Payment** continues via `MarkPaidSettlementDialog` (Total Due, payment methods, confirm) — no split/allocation panel required.

---

## 6. Production validation

| Criterion | Result |
|-----------|--------|
| No Multi Check Allocation card | Pass — not mounted |
| No “Split Payments” section | Pass — panel unmounted |
| No allocation/split loading spinner from those panels | Pass |
| No allocation status UI | Pass |
| No split/allocation hooks executed by workspace sheet | Pass — no panel mount |
| No split/allocation queries from payment workspace | Pass — no `splitPayment` / `multiCheckAllocation` usage in sheet or action bars |
| No dead imports for those panels in workspace | Pass |
| No orphaned invalidations | Pass |
| Core capability dormant + reactivation supported | Pass — capability modules |

**Recommended manual check:** open an active Session Details sheet and confirm the Split Payments card is gone and Network tab shows no `splitPayment.*` / `multiCheckAllocation.*` requests while browsing the sheet.

---

## Acceptance

Presentation-only cleanup complete. Split Payment and Multi Check Allocation remain **Dormant · UI Disabled · Core Active · Reactivation Supported**.
