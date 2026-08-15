# OPEN-DECISIONS.md

Resolved by this program:

- Checkout **price source** can move independently of FX/Tax/Provider — **done**.
- No real customer contract migration — **none designed**.
- `legacyPlanId` = LEGACY COMPATIBILITY IDENTIFIER — **classified**.

Still open (do not invent):

1. When to drop the integer Checkout/API handle.  
2. Tap SAR vs USD commercial amount (provider/local) — **deferred**.  
3. MRR implementation details (COMMERCIAL-MRR-CHARGED-TERMS-MIGRATION-1).  
4. Admin invoice amount: Charged Terms vs current offer for test/admin invoices.  
5. ADR-035 text update after AA review.  
6. SAFE DELETE approval after residuals + MRR are gone.

Not reopened: USD commercial currency; Live Plan vs Charged Terms; period lock; no lifetime lock.
