# 12 — FINANCIAL BOUNDARY

Verified against code — Live Plan is **not** SSOT for:

| Domain | Actual authority |
|--------|------------------|
| Revenue | Paid Check / settlement reporting (not catalog) |
| Settlement | Settlement records / operational session |
| Payment | PayPal/Tap capture |
| Refund | Refund documents (out of scope) |
| Invoice historical amount | `invoices` + Charged Terms for PDF amount |
| MRR | `chargedTermsMrr.ts` ← bindings only |
| Cash / Register | CRMP shift (out of scope) |

## Expected mapping (holds)

```
Live Plan     → Offer List Price (current)
Charged Terms → customer commercial commitment (if bound)
Settlement    → financial completion
Reporting     → financial read model (CRS/CanonicalMetrics)
```

## Documented leaks (not redesigned here)

1. Tap charges USD list **number** as SAR.  
2. Provider capture amount is never copied into Charged Terms.  
3. Unbound subscriptions (4/6 Production) → MRR 0, not live price (fail-safe, incomplete coverage).  
4. Webhook bind defaults cycle to monthly.

These do **not** make Live Plan the MRR or revenue SSOT. They mean Charged Terms / provider books can diverge from each other and from catalog.
