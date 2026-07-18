# SETTLEMENT-PAYMENT-METHOD-CAPTURE-1 — Implementation Report

## Final status

**Ready for independent architecture review.**

---

## 1. Repository investigation

| Entry | Path |
|-------|------|
| Mark Paid UI | `DiningSessionActionBar`, `SessionRowQuickActions` |
| New dialog | `MarkPaidSettlementDialog` |
| API | `session.markPaid` in `server/routers.ts` |
| Session service | `markPaid` → `settleAndCloseSession` → `settleCheckPaid` |
| Check domain | `finalizeOpenCheck` → `resolveStaffSettlementLines` / `defaultPaidSettlementLine` |
| Persistence | `insertSettlementTransactions` (unchanged) |
| Reporting | `PaymentMethodAnalyticsService` (unchanged consumer) |

---

## 2. Files modified / added

**Added**

- `shared/operational-session/check/staffSettlementDto.ts`
- `client/src/components/dashboard/MarkPaidSettlementDialog.tsx`
- `client/src/lib/settlementPaymentMethodPresentation.ts`
- Architecture guards + tests
- This report

**Modified**

- `settlementInvariants.ts` — `resolveStaffSettlementLines`
- `CheckService.ts` — staff DTO + resolve path
- `sessionService.ts` — `MarkPaidInput.settlements` pass-through
- `server/routers.ts` — optional `settlements[]` on `markPaid`
- `DiningSessionActionBar.tsx`, `SessionRowQuickActions.tsx`
- `diningSessionActionCopy.ts`
- Exports / prior architecture guard for markPaid signature

---

## 3. Presentation adoption

- Touch grid of all `MONETARY_PAYMENT_METHODS`
- Labels via `preferredPaymentMethodLabel` (Product Semantics)
- Operator must select a method before Confirm
- Single tender: amount omitted → domain fills Check `grandTotal`

---

## 4. API changes

```ts
session.markPaid({
  restaurantId,
  sessionId,
  settlements?: Array<{
    paymentMethod: MonetaryPaymentMethod;
    amount?: string;
  }>
})
```

**Compatibility:** `settlements` omitted → legacy `"other"` full-cover line.

---

## 5. DTO changes

`StaffSettlementLineInput` — reusable staff settlement line  
(`paymentMethod` required; `amount` optional for single tender).

---

## 6. Domain adoption

| Input | Behavior |
|-------|----------|
| `settlements` with 1+ lines | `resolveStaffSettlementLines` → persist exactly |
| `settlements` omitted | `defaultPaidSettlementLine` → `"other"` |
| Multi-tender without amounts | Validation error |

No Revenue / Tax / ownership changes.

---

## 7. Persistence validation

Unchanged insert path; `paymentMethod` column stores operator-selected code.

---

## 8. Reporting validation

Zero reporting architecture changes. Analytics continues to bucket persisted Settlement Transactions — new methods appear automatically on Dashboard / Excel / PDF.

---

## 9. Backward compatibility

| Concern | Status |
|---------|--------|
| Historical `"other"` rows | Unchanged |
| Callers omitting settlements | Legacy default preserved |
| Architecture guard | Updated to require optional `settlements` |

---

## 10. Multi-tender readiness

| Capability | Status |
|------------|--------|
| API array of lines | Yes |
| Domain sum validation | Yes (`assertPaidSettlementLines`) |
| UI multi-line editor | Not in this program (single-tender UX); API ready |

---

## 11. UX validation

- Tablet/touch grid (`h-12` / `h-14`, 2×4 layout)
- One dialog: select method + confirm
- Complimentary / Close unchanged

---

## 12. Risks

1. Operators who skip method cannot proceed (intentional).  
2. Legacy API omit still writes `"other"` — document for integrators.  
3. Multi-tender UI deferred — API already supports it.

---

## 13. Recommendations

1. Optional follow-up: multi-tender split editor with Check grandTotal preview.  
2. Do not backfill historical `"other"` without external evidence.

---

## 14. Final implementation status

| Gate | Result |
|------|--------|
| Capture wired UI → API → Domain → DB | Yes |
| Reporting unchanged | Yes |
| Legacy omit path | Yes |
| Catalog / labels SSOT | Yes |
| Ready for architecture review | **Yes** |
