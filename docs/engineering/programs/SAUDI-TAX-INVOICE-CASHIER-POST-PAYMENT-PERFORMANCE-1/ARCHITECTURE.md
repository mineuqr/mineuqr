# ARCHITECTURE

## Diagnosis conclusion

Payment/settlement does **not** await Saudi Tax Invoice generation.
Additional latency was post-PAID Cashier readiness: polling `getPhase1ByOrder`
while each hit optionally rendered HTML + QR PNG unused by Cashier.

## Changes

| Area | Change |
|------|--------|
| Phase 1 view | `includeHtml` default false |
| Cashier query | `includeHtml: false`, poll 300ms |
| Post-pay order | Open Tax Invoice dialog → mark → end flow → microtask invalidate |
| Compliance dispatch | Unchanged fire-and-forget |

## Invariants preserved

Collection Fact / PAID / Payment / Settlement unchanged.  
One Saudi customer-facing document. Paid Receipt retained operationally.  
Phase 1 QR path unchanged (domain generation). Cashier still does not generate QR.
