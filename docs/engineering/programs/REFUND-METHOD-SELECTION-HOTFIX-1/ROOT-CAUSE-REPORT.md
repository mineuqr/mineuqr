# REFUND-METHOD-SELECTION-HOTFIX-1 — Root Cause Report

| Field | Value |
|---|---|
| **Program** | REFUND-METHOD-SELECTION-HOTFIX-1 |
| **Date** | 2026-07-26 |
| **Verdict** | **PRODUCTION CERTIFIED** |

---

## Symptom

Refund dialog tender buttons (**نقدًا** / **بطاقة (شبكة / بنك)**) did not respond to selection: no durable single-select highlight, Save remained disabled (`tender` never became a valid method).

---

## Root cause

`listMonetaryPaymentMethodOptions()` returns:

```ts
{ paymentMethod: SelectablePaymentMethod; label: string }
```

`SettlementLedgerRefundDialog` incorrectly bound:

```ts
opt.value          // undefined — property does not exist
setTender(opt.value)
tender === opt.value
```

### State flow failure

| Stage | Before fix |
|-------|------------|
| User click | Event fired |
| `setTender(opt.value)` | Set `undefined` |
| Selected tender | Never `cash` / `card` |
| Highlight | Broken (`undefined === undefined` for every option after click) |
| `canSave` (`!!tender`) | Always false |
| Save payload `tenderMethod` | Unreachable |

Working reference: `MarkPaidSettlementDialog` correctly uses `opt.paymentMethod`.

Not caused by Dialog overlay, pointer-events, disabled flags, or domain/API issues.

---

## Final Certification

**PRODUCTION CERTIFIED**
