# PERFORMANCE-FINDINGS

## Critical question answer

Does Confirm → PAID **await** Tax Invoice generation?

**NO.** `dispatchComplianceAfterProductionCollectionFact` uses
`dispatchBestEffortDownstreamDelivery` (`void delivery().catch(...)`).
Payment HTTP returns after Collection Fact / PAID / paidReceipt projection.

## Observed user timing (operator baseline)

| Segment | Approx |
|---------|--------|
| Confirm → Payment response / PAID | 2–3 s |
| PAID → Tax Invoice View/Print ready | +4–5 s |
| Total Confirm → usable Tax Invoice | 8–9 s |

## Blocking chain (post-PAID Cashier path)

```
settleMutation response (PAID)
  → invalidateOrderReads() (many parallel POS invalidations)
  → setTaxInvoiceOpen(true)
  → getPhase1ByOrder enabled
  → poll every 1000ms until document present
  → each successful/near-ready read: ensurePhase1Ready
       + renderSaudiPhase1InvoiceHtml (QRCode.toDataURL PNG)
  → Cashier maps document (html unused)
```

## Primary unnecessary cost

Cashier never consumes `html`. Phase 1 view service always awaited
`renderSaudiPhase1InvoiceHtml` → `QRCode.toDataURL` on **every**
`getPhase1ByOrder` (including polls). That inflates readiness latency.

Secondary: 1000ms poll interval delays detecting async Compliance completion.
Compliance generation itself remains async after PAID (correct; not moved into payment).

## Fix boundary

1. Default Phase 1 read: `includeHtml: false` (Cashier).
2. Faster poll (~300ms) until READY/terminal; stop when done.
3. Open Tax Invoice dialog / clear payment busy before heavy invalidations contend.
4. Timing marks for PAID → dialog open → Tax Invoice ready (dev telemetry).
