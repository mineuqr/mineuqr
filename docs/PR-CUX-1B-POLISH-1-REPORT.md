# PR-CUX-1B-POLISH-1 — Status Stepper Direction Audit

**Mode:** Audit → Fix → Verify  
**Scope:** `OrderStatusPage` customer tracking stepper  
**Status:** Complete

---

## 1. Current State (Before Fix)

### Implementation

- Inline `<ol>` in `OrderStatusPage.tsx`
- Four steps in DOM order: `pending → preparing → ready → served`
- Visual logic: `done || current` shared the **same** filled-orange dot style
- No connectors between steps
- `served` treated as **current** step (index 3), not fully completed
- `cancelled` correctly hid stepper

### Audit Answers (Before)

| Question | Finding |
|----------|---------|
| Is RTL direction correct? | **Partially** — DOM order is correct for RTL (pending starts on the right), but lack of connectors made flow hard to read |
| Natural for Arabic reader? | **Weak** — labels cramped; no visual progression between stages |
| Illogical visual reversal? | **No mirror bug**, but completed vs current looked identical |
| Lifecycle order matches ops? | **Yes** — sequence matched dashboard |
| Completed / current / future clear? | **No** — completed ≡ current styling |
| Served terminal state? | **Weak** — last dot shown as “current”, not “done” |
| Cancelled terminal state? | **OK** — stepper hidden |

---

## 2. Problems Discovered

1. **Completed = current styling** — users could not see which stage was active vs already passed.
2. **No connector lines** — progression direction ambiguous on mobile.
3. **`served` not fully completed** — misleading “in progress” appearance at terminal state.
4. **Completed step labels** — all non-current labels were muted grey, including finished stages.

---

## 3. Final Decision

| Area | Decision |
|------|----------|
| Step DOM order | Keep `pending → preparing → ready → served` (matches operational lifecycle) |
| RTL | Inherit page `dir="rtl"` on stepper — pending on the **right**, served on the **left** (natural Arabic reading) |
| LTR | Same DOM order — pending left, served right |
| Visual states | Three distinct states: `completed`, `current`, `future` |
| Connectors | Horizontal bars between dots; filled when preceding step is complete |
| `served` | All steps + connectors **completed**; green completion theme |
| `cancelled` | Stepper **hidden**; red headline panel only |

---

## 4. Before / After

### Before

```
[●][●][○][○]   ← current and done both solid orange
قيد الانتظار … تم التقديم
```

### After

```
قيد الانتظار —— قيد التحضير —— جاهز —— تم التقديم   (RTL, right → left)

●━━━━●━━━━◎━━━━○
 ^done  ^done ^current ^future

Served:  ●━━━━●━━━━●━━━━●  (all green, completed)
Cancelled: (no stepper)
```

---

## 5. Files Changed

| File | Change |
|------|--------|
| `client/src/lib/orderStatusDisplay.ts` | `getOrderStepVisualState`, `isOrderStepConnectorCompleted` |
| `client/src/lib/orderStatusDisplay.test.ts` | Stepper state unit tests |
| `client/src/components/customer/OrderStatusStepper.tsx` | **New** dedicated stepper |
| `client/src/pages/OrderStatusPage.tsx` | Uses `OrderStatusStepper`; green served banner |
| `scripts/capture-order-stepper-screenshots.mjs` | Screenshot utility |
| `docs/pr-cux-1b-polish-1/*.png` | State screenshots |

**Excluded (unchanged):** Owner Dashboard, Orders Tab, notifications, admin.

---

## 6. Screenshots

Captured at `docs/pr-cux-1b-polish-1/`:

| Status | File |
|--------|------|
| pending | `stepper-pending-ar.png` |
| preparing | `stepper-preparing-ar.png` |
| ready | `stepper-ready-ar.png` |
| served | `stepper-served-ar.png` |
| cancelled | `stepper-cancelled-ar.png` |

---

## 7. Verification

### Automated

| Check | Result |
|-------|--------|
| `npm run check` | PASS |
| `orderStatusDisplay.test.ts` | 6/6 PASS |
| `order-get-public-status.test.ts` | 3/3 PASS (PR-CUX-1B regression) |

### Manual states

| Status | Label (AR) | Expected UI | Verified |
|--------|------------|-------------|----------|
| pending | قيد الانتظار | Step 1 current, rest future | Screenshot |
| preparing | قيد التحضير | Step 2 current, 1 done | Screenshot |
| ready | جاهز | Step 3 current, 1–2 done | Screenshot |
| served | تم التقديم | All green completed, no “current” | Screenshot |
| cancelled | ملغي | No stepper, red panel | Screenshot |

### Browser matrix (operator)

- Desktop Chrome — screenshot script (Chromium)
- Mobile Chrome — same viewport 390×844
- Safari iPhone — recommend spot-check on device (connector + RTL)

---

## 8. Acceptance Criteria

| Criterion | Met |
|-----------|-----|
| RTL correct | Yes |
| Logical sequence for Arabic user | Yes |
| Current step clear | Yes (ring + scale + bold label) |
| Completed steps clear | Yes (solid fill + medium label) |
| Cancelled correct | Yes (stepper hidden) |
| No PR-CUX-1A regression | Yes |
| No PR-CUX-1B regression | Yes |

---

## 9. Out of Scope

Ready notifications, push, order numbering, CUX-DATE-1, dashboard lifecycle — unchanged.
